import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { renderMarkdownToReact } from '../utils/markdownParser';

const STORAGE_KEY = 'geochat_conversations_v3';
const ACTIVE_SESSION_KEY = 'geochat_active_session_id';

const WELCOME_MESSAGE = {
  role: 'assistant',
  content: `### 🌐 Welcome to GeoNexus Spatial AI Assistant

I am your domain-specialized industrial siting, GIS intelligence, and environmental compliance copilot for Gujarat.

**How can I assist you today?**
- 📍 **Compare Siting Locations**: Ask *"Which city is preferable for Cotton industry: Surat or Ahmedabad?"*
- 🏭 **Analyze Location Suitability**: Inquire with coordinates (e.g. \`22.98, 72.38\`) and an industry type.
- 📜 **Statutory Clearances**: Ask about GPCB CTE/CTO procedures, CPCB Red/Orange/Green categories, and EIA 2006.
- 🗺️ **Infrastructure Proximity**: Check distances to GETCO substations, highways, rivers, gas lines, and ports.`,
  metadata: null
};

export default function GeoChat() {
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  const nodeContextRef = useRef(null);  // stores node context for Ask About It
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef(null);
  const streamIntervalRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // 1. Load sessions from database on mount (with localStorage fallback)
  const fetchDatabaseSessions = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('geochat/sessions/');
      let loadedSessions = res.data.map(s => ({
        id: s.session_id,
        title: s.title,
        createdAt: new Date(s.created_at).getTime(),
        messages: s.messages.length > 0 ? s.messages : [WELCOME_MESSAGE]
      }));

      if (loadedSessions.length === 0) {
        const initialSession = {
          id: `session_${Date.now()}`,
          title: 'New Conversation',
          createdAt: Date.now(),
          messages: [WELCOME_MESSAGE]
        };
        loadedSessions = [initialSession];
      }

      setSessions(loadedSessions);

      const lastActiveId = localStorage.getItem(ACTIVE_SESSION_KEY);
      const matched = loadedSessions.find(s => s.id === lastActiveId);
      setActiveSessionId(matched ? matched.id : loadedSessions[0].id);
    } catch (e) {
      console.error('Failed to load geochat sessions from database:', e);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        let loadedSessions = stored ? JSON.parse(stored) : [];

        if (loadedSessions.length === 0) {
          loadedSessions = [{
            id: `session_${Date.now()}`,
            title: 'New Conversation',
            createdAt: Date.now(),
            messages: [WELCOME_MESSAGE]
          }];
        }
        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
      } catch (err) {
        const fallback = [{
          id: `session_${Date.now()}`,
          title: 'New Conversation',
          createdAt: Date.now(),
          messages: [WELCOME_MESSAGE]
        }];
        setSessions(fallback);
        setActiveSessionId(fallback[0].id);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseSessions();
  }, []);

  // Check for node context injected by NodeDetail "Ask About It" button
  useEffect(() => {
    const rawCtx = sessionStorage.getItem('geochat_node_context');
    if (!rawCtx) return;
    sessionStorage.removeItem('geochat_node_context');

    try {
      const ctx = JSON.parse(rawCtx);
      // Store structured context in ref so the first send includes it
      nodeContextRef.current = ctx;

      const contextMsg = `Provide a full expert analysis and strategic recommendations for my deployed node **"${ctx.nodeName}"** located at **${ctx.district}** (${Number(ctx.lat).toFixed(5)}°N, ${Number(ctx.lon).toFixed(5)}°E) — industry: **${ctx.industry}**, suitability score **${ctx.score?.toFixed(1)}/100 (${ctx.label})**. Cover infrastructure, regulatory compliance, risks, and actionable recommendations.`;

      setInput(contextMsg);
    } catch (e) {
      console.error('Failed to parse node context:', e);
    }
  }, []);


  // 2. Persist activeSessionId
  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem(ACTIVE_SESSION_KEY, activeSessionId);
    }
  }, [activeSessionId]);

  // 3. Scroll to bottom on messages change
  const activeSession = sessions.find(s => s.id === activeSessionId) || sessions[0] || { messages: [WELCOME_MESSAGE] };
  const currentMessages = activeSession.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentMessages, isLoading, isStreaming]);

  // Helper to persist sessions state
  const saveSessions = (newSessions) => {
    setSessions(newSessions);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newSessions));
    } catch (e) {
      console.error('Failed to save chat sessions:', e);
    }
  };

  // Create a new chat session
  const createNewChat = () => {
    if (isStreaming && streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      setIsStreaming(false);
    }
    const newSession = {
      id: `session_${Date.now()}`,
      title: 'New Conversation',
      createdAt: Date.now(),
      messages: [WELCOME_MESSAGE]
    };
    const updated = [newSession, ...sessions];
    saveSessions(updated);
    setActiveSessionId(newSession.id);
  };

  // Delete a chat session from DB & optimistic local state update
  const deleteSession = async (idToDelete, e) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== idToDelete);
    if (updated.length === 0) {
      const fresh = {
        id: `session_${Date.now()}`,
        title: 'New Conversation',
        createdAt: Date.now(),
        messages: [WELCOME_MESSAGE]
      };
      saveSessions([fresh]);
      setActiveSessionId(fresh.id);
    } else {
      saveSessions(updated);
      if (activeSessionId === idToDelete) {
        setActiveSessionId(updated[0].id);
      }
    }

    try {
      await api.delete(`geochat/sessions/${idToDelete}/`);
    } catch (err) {
      console.error("Failed to delete chat session on database:", err);
    }
  };

  // Stream assistant text word-by-word (ChatGPT style)
  const streamResponse = (fullAnswer, metadata, targetSessionId) => {
    setIsStreaming(true);
    const words = fullAnswer.split(/(\s+)/); // Preserves spaces
    let currentIndex = 0;
    let accumulatedText = '';

    // Put initial placeholder
    setSessions(prev => prev.map(s => {
      if (s.id !== targetSessionId) return s;
      return {
        ...s,
        messages: [
          ...s.messages,
          { role: 'assistant', content: '', metadata, isStreaming: true }
        ]
      };
    }));

    const step = () => {
      // Stream 2-3 words per tick for snappy, smooth feel
      const chunkCount = Math.min(3, words.length - currentIndex);
      if (chunkCount <= 0 || currentIndex >= words.length) {
        clearInterval(streamIntervalRef.current);
        streamIntervalRef.current = null;
        setIsStreaming(false);

        // Finalize message
        setSessions(prev => {
          const updated = prev.map(s => {
            if (s.id !== targetSessionId) return s;
            const msgs = [...s.messages];
            if (msgs.length > 0) {
              msgs[msgs.length - 1] = {
                role: 'assistant',
                content: fullAnswer,
                metadata,
                isStreaming: false
              };
            }
            return { ...s, messages: msgs };
          });
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
        return;
      }

      for (let i = 0; i < chunkCount; i++) {
        accumulatedText += words[currentIndex + i];
      }
      currentIndex += chunkCount;

      setSessions(prev => prev.map(s => {
        if (s.id !== targetSessionId) return s;
        const msgs = [...s.messages];
        if (msgs.length > 0) {
          msgs[msgs.length - 1] = {
            role: 'assistant',
            content: accumulatedText,
            metadata,
            isStreaming: true
          };
        }
        return { ...s, messages: msgs };
      }));
    };

    streamIntervalRef.current = setInterval(step, 20);
  };

  // Stop streaming immediately and show full text
  const stopStreaming = (fullAnswer) => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    setIsStreaming(false);

    setSessions(prev => {
      const updated = prev.map(s => {
        if (s.id !== activeSessionId) return s;
        const msgs = [...s.messages];
        if (msgs.length > 0 && msgs[msgs.length - 1].isStreaming) {
          msgs[msgs.length - 1] = {
            ...msgs[msgs.length - 1],
            isStreaming: false
          };
        }
        return { ...s, messages: msgs };
      });
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Send a user query
  const sendQuery = async (queryText) => {
    if (!queryText.trim() || isLoading || isStreaming) return;

    const userMessage = queryText.trim();
    setInput('');

    const targetSessionId = activeSessionId;
    const currentSess = sessions.find(s => s.id === targetSessionId) || sessions[0];
    const isFirstUserMsg = currentSess.messages.filter(m => m.role === 'user').length === 0;

    // Derive concise title from first user query
    let newTitle = currentSess.title;
    if (isFirstUserMsg) {
      const cleanTitle = userMessage.replace(/[^\w\s:,-]/g, '').trim();
      newTitle = cleanTitle.length > 38 ? cleanTitle.slice(0, 35) + '...' : cleanTitle;
    }

    const updatedMessages = [
      ...currentSess.messages,
      { role: 'user', content: userMessage, metadata: null }
    ];

    const updatedSessions = sessions.map(s => {
      if (s.id === targetSessionId) {
        return { ...s, title: newTitle, messages: updatedMessages };
      }
      return s;
    });

    saveSessions(updatedSessions);
    setIsLoading(true);

    try {
      const historyToPass = currentSess.messages
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content }));

      // If this is the first message in a node-context session, attach the node data
      const nodeCtx = nodeContextRef.current;
      if (nodeCtx && isFirstUserMsg) {
        nodeContextRef.current = null; // consume after first send
      }

      const res = await api.post('geochat/geochat/', {
        session_id: targetSessionId,
        title: newTitle,
        message: userMessage,
        history: historyToPass.length > 0 ? historyToPass : undefined,
        ...(nodeCtx && isFirstUserMsg ? { node_context: nodeCtx } : {})
      });

      setIsLoading(false);

      if (res.data && res.data.answer) {
        streamResponse(res.data.answer, res.data.metadata || null, targetSessionId);
      } else {
        const errorMsg = "Sorry, I received an empty response. Please try again.";
        const fallbackSessions = sessions.map(s => {
          if (s.id === targetSessionId) {
            return {
              ...s,
              messages: [...s.messages, { role: 'assistant', content: errorMsg, metadata: null }]
            };
          }
          return s;
        });
        saveSessions(fallbackSessions);
      }
    } catch (error) {
      console.error("GeoChat Error:", error);
      setIsLoading(false);
      const errDetail = error.response?.data?.error || error.response?.data?.detail || "An error occurred while communicating with the AI server. Please make sure the backend is running.";
      const errorSessions = sessions.map(s => {
        if (s.id === targetSessionId) {
          return {
            ...s,
            messages: [...s.messages, { role: 'assistant', content: `⚠️ ${errDetail}`, metadata: null }]
          };
        }
        return s;
      });
      saveSessions(errorSessions);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    sendQuery(input);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const copyToClipboard = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      background: 'var(--bg-primary, #0a0e1a)',
      overflow: 'hidden',
      color: 'var(--text-primary, #f8fafc)'
    }}>
      {/* ========================================================================= */}
      {/* CHATGPT-STYLE SIDEBAR */}
      {/* ========================================================================= */}
      <aside style={{
        width: sidebarOpen ? '260px' : '0px',
        minWidth: sidebarOpen ? '260px' : '0px',
        height: '100%',
        background: 'rgba(10, 14, 26, 0.95)',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        overflow: 'hidden',
        zIndex: 50,
      }}>
        {/* Top Action Header */}
        <div style={{
          padding: '14px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)'
        }}>
          <button
            onClick={createNewChat}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '9px 14px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))',
              border: '1px solid rgba(34,211,238,0.3)',
              color: '#22d3ee',
              fontSize: '13.5px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(59,130,246,0.25))'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))'; }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Chat
          </button>

          <button
            onClick={() => setSidebarOpen(false)}
            style={{
              padding: '8px',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted, #94a3b8)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Collapse sidebar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="9" y1="3" x2="9" y2="21"/>
            </svg>
          </button>
        </div>

        {/* Sessions List */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: 'rgba(255,255,255,0.4)',
            padding: '6px 8px 4px'
          }}>
            Recent Chats
          </div>

          {sessions.map(sess => {
            const isActive = sess.id === activeSessionId;
            return (
              <div
                key={sess.id}
                onClick={() => {
                  if (isStreaming && streamIntervalRef.current) {
                    clearInterval(streamIntervalRef.current);
                    setIsStreaming(false);
                  }
                  setActiveSessionId(sess.id);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '9px 10px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  background: isActive ? 'rgba(34, 211, 238, 0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(34, 211, 238, 0.25)' : '1px solid transparent',
                  color: isActive ? '#22d3ee' : 'var(--text-secondary, #cbd5e1)',
                  fontSize: '13px',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={e => {
                  if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.background = 'transparent';
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  flex: 1
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {sess.title || 'Conversation'}
                  </span>
                </div>

                <button
                  onClick={(e) => deleteSession(sess.id, e)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'rgba(255,255,255,0.3)',
                    padding: '2px 4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'color 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.3)'; }}
                  title="Delete chat"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6"/>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                  </svg>
                </button>
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div style={{
          padding: '12px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '700',
            fontSize: '13px',
            color: '#fff'
          }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name || 'Enterprise User'}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted, #94a3b8)' }}>
              GeoNexus AI Pro
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* MAIN CHAT AREA */}
      {/* ========================================================================= */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        position: 'relative',
        background: 'var(--bg-primary, #0a0e1a)'
      }}>
        {/* Top Navbar */}
        <header style={{
          height: '56px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          background: 'rgba(10, 14, 26, 0.85)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          zIndex: 40,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: '500'
                }}
                title="Open sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <line x1="9" y1="3" x2="9" y2="21"/>
                </svg>
                History
              </button>
            )}

            <button
              onClick={() => navigate('/home')}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary, #94a3b8)',
                padding: '6px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Back to Home"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7"/>
              </svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: '700', fontSize: '15px', letterSpacing: '-0.02em' }}>
                <span style={{ color: '#22d3ee' }}>GeoNexus</span>
                <span style={{ color: '#f8fafc' }}> AI</span>
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={createNewChat}
              style={{
                padding: '6px 12px',
                fontSize: '12.5px',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                background: 'rgba(255, 255, 255, 0.04)',
                color: 'var(--text-primary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              ✨ New Chat
            </button>
          </div>
        </header>

        {/* Message Thread */}
        <main style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '820px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            paddingBottom: '60px'
          }}>
            {currentMessages.map((msg, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  gap: '14px',
                  alignItems: 'flex-start',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  background: msg.role === 'user'
                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'
                    : 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
                  border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.4)' : 'rgba(34,211,238,0.35)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: msg.role === 'assistant' ? '0 0 12px rgba(34,211,238,0.15)' : 'none',
                }}>
                  {msg.role === 'user' ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                      <polyline points="2 17 12 22 22 17"/>
                      <polyline points="2 12 12 17 22 12"/>
                    </svg>
                  )}
                </div>

                {/* Message Bubble */}
                <div style={{
                  maxWidth: '88%',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}>
                  <div style={{
                    padding: msg.role === 'user' ? '12px 18px' : '18px 22px',
                    borderRadius: '16px',
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'
                      : 'rgba(255, 255, 255, 0.03)',
                    border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)',
                    color: msg.role === 'user' ? '#fff' : 'var(--text-primary, #f8fafc)',
                    boxShadow: msg.role === 'user'
                      ? '0 4px 14px rgba(37,99,235,0.3)'
                      : '0 4px 20px rgba(0, 0, 0, 0.25)',
                    fontSize: '14.5px',
                    lineHeight: '1.65',
                    borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                    borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                    wordBreak: 'break-word',
                  }}>
                    {msg.role === 'user' ? (
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                    ) : (
                      <div className="geochat-markdown-container">
                        {renderMarkdownToReact(msg.content)}
                        {msg.isStreaming && (
                          <span style={{
                            display: 'inline-block',
                            width: '8px',
                            height: '16px',
                            background: '#22d3ee',
                            marginLeft: '4px',
                            verticalAlign: 'middle',
                            animation: 'pulse 1s infinite'
                          }} />
                        )}
                      </div>
                    )}

                    {/* Copy Button */}
                    {msg.role === 'assistant' && !msg.isStreaming && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        marginTop: '12px',
                        paddingTop: '8px',
                        borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                      }}>
                        <button
                          onClick={() => copyToClipboard(msg.content, idx)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-muted, #94a3b8)',
                            fontSize: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'color 0.15s'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.color = '#22d3ee'; }}
                          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted, #94a3b8)'; }}
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                          {copiedIdx === idx ? '✓ Copied' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '10px',
                  flexShrink: 0,
                  background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
                  border: '1px solid rgba(34,211,238,0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 2 7 12 12 22 7 12 2"/>
                    <polyline points="2 17 12 22 22 17"/>
                    <polyline points="2 12 12 17 22 12"/>
                  </svg>
                </div>
                <div style={{
                  padding: '16px 20px',
                  borderRadius: '16px',
                  borderTopLeftRadius: '4px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22d3ee', animation: 'pulse 1.4s infinite 0s' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.4s infinite 0.2s' }} />
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', animation: 'pulse 1.4s infinite 0.4s' }} />
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary, #94a3b8)', marginLeft: '6px' }}>
                    Consulting GeoNexus ML models & spatial GIS data...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* ========================================================================= */}
        {/* FOOTER INPUT BAR & CONTROLS */}
        {/* ========================================================================= */}
        <footer style={{
          padding: '12px 20px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          background: 'linear-gradient(to top, rgba(10,14,26,1) 80%, rgba(10,14,26,0))',
          position: 'relative',
          zIndex: 10,
        }}>
          {/* Floating Stop Generating Button */}
          {isStreaming && (
            <button
              onClick={() => stopStreaming()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '20px',
                background: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                fontSize: '12.5px',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                marginBottom: '4px'
              }}
            >
              <span style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '2px' }} />
              Stop Generating
            </button>
          )}

          {/* Quick Prompt Starters (shown on fresh chats) */}
          {currentMessages.length <= 1 && (
            <div style={{
              display: 'flex',
              gap: '8px',
              overflowX: 'auto',
              maxWidth: '820px',
              width: '100%',
              paddingBottom: '4px',
              scrollbarWidth: 'none'
            }}>
              {[
                "Which city is preferable for Cotton industry: Surat or Ahmedabad?",
                "How does LightGBM predict suitability score & feature importance?",
                "What are the soil types and construction suitability in South Gujarat?",
                "Explain groundwater extraction rules and CGWB status in Gujarat",
                "What is NDVI and how is it calculated from Sentinel-2?",
                "What are GPCB CTE and CTO compliance requirements for Red category?",
                "Evaluate chemical plant suitability in Sanand (22.98, 72.38)"
              ].map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => sendQuery(prompt)}
                  disabled={isLoading || isStreaming}
                  style={{
                    whiteSpace: 'nowrap',
                    fontSize: '12px',
                    fontWeight: '500',
                    padding: '7px 14px',
                    borderRadius: '20px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    color: 'var(--text-secondary, #cbd5e1)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = '#22d3ee';
                    e.currentTarget.style.color = '#22d3ee';
                    e.currentTarget.style.background = 'rgba(34, 211, 238, 0.06)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-secondary, #cbd5e1)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  }}
                >
                  💡 {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input Box */}
          <form
            onSubmit={handleSubmit}
            style={{
              width: '100%',
              maxWidth: '820px',
              position: 'relative',
              display: 'flex',
              alignItems: 'flex-end',
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '6px 8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
              backdropFilter: 'blur(16px)',
              transition: 'border-color 0.2s',
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)'}
            onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask GeoNexus AI (e.g. Compare Surat vs Ahmedabad for Cotton industry, Siting score at coordinates)..."
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary, #f8fafc)',
                padding: '10px 14px',
                fontSize: '14px',
                resize: 'none',
                outline: 'none',
                maxHeight: '140px',
                minHeight: '24px',
                fontFamily: 'inherit',
              }}
              onInput={(e) => {
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading || isStreaming}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                flexShrink: 0,
                background: input.trim() && !isLoading && !isStreaming
                  ? 'linear-gradient(135deg, #22d3ee, #3b82f6)'
                  : 'rgba(255, 255, 255, 0.06)',
                color: input.trim() && !isLoading && !isStreaming ? '#0f172a' : 'rgba(255, 255, 255, 0.3)',
                border: 'none',
                cursor: input.trim() && !isLoading && !isStreaming ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s',
                margin: '2px',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </form>

          <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.35)', textAlign: 'center' }}>
            GeoNexus AI delivers ML-predicted siting analysis & GIS intelligence for Gujarat industrial planning.
          </div>
        </footer>
      </div>
    </div>
  );
}
