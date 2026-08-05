import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../contexts/AuthContext';

export default function GeoChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hello! I'm GeoNexus AI. I can help you analyze location suitability, environmental clearances, and provide insights for industrial setup. How can I assist you today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    const savedHistory = sessionStorage.getItem('geochat_history');
    if (savedHistory) {
      try {
        setMessages(JSON.parse(savedHistory));
      } catch (e) {
        console.error('Failed to parse saved chat history');
      }
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem('geochat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    const newMessages = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const historyToPass = messages.filter(m => m.role !== 'system' && (m.role !== 'assistant' || m.content !== "Hello! I'm GeoNexus AI. I can help you analyze location suitability, environmental clearances, and provide insights for industrial setup. How can I assist you today?"));

      const res = await api.post('geochat/geochat/', {
        message: userMessage,
        history: historyToPass.length > 0 ? historyToPass : undefined
      });

      if (res.data && res.data.answer) {
        setMessages(prev => [...prev, { role: 'assistant', content: res.data.answer }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I received an empty response. Please try again." }]);
      }
    } catch (error) {
      console.error("GeoChat Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "An error occurred while communicating with the AI server. Please make sure the model is loaded and the backend is running." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const renderMessageContent = (content) => {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br />');
    
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--bg-primary)' }}>
      <header style={{
        height: 'var(--nav-h)', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(12px, 3vw, 24px)',
        background: 'rgba(10, 14, 26, 0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--border-subtle)',
        zIndex: 100,
        boxShadow: 'var(--shadow-xs)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-secondary)', padding: '8px', borderRadius: 'var(--r-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--glass-hover)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            title="Back to Dashboard"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
          </button>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(34,211,238,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 12px rgba(34,211,238,0.15)',
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="url(#chatGl)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                <defs><linearGradient id="chatGl" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient></defs>
              </svg>
            </div>
            <span style={{ fontWeight: '800', fontSize: '16px', fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}>
              <span className="gradient-text-static">GeoChat</span>
              <span style={{ color: 'var(--text-primary)' }}> AI</span>
            </span>
          </div>
        </div>

        <button
          onClick={() => { setMessages([{ role: 'assistant', content: "Hello! I'm GeoNexus AI. I can help you analyze location suitability, environmental clearances, and provide insights for industrial setup. How can I assist you today?" }]); }}
          className="btn-ghost"
          style={{ padding: '6px 12px', fontSize: '13px' }}
        >
          New Chat
        </button>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: '100%', maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '40px' }}>
          
          {messages.map((msg, idx) => (
            <div key={idx} style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                background: msg.role === 'user' ? 'rgba(59,130,246,0.15)' : 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
                border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.3)' : 'rgba(34,211,238,0.3)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: msg.role === 'assistant' ? '0 0 12px rgba(34,211,238,0.1)' : 'none',
              }}>
                {msg.role === 'user' ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                    <circle cx="24" cy="24" r="20" stroke="url(#navGl2)" strokeWidth="2"/>
                    <ellipse cx="24" cy="24" rx="9" ry="20" stroke="url(#navGl2)" strokeWidth="1.5"/>
                    <defs><linearGradient id="navGl2" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient></defs>
                  </svg>
                )}
              </div>

              <div style={{
                maxWidth: '85%',
                padding: '16px 20px',
                borderRadius: '16px',
                background: msg.role === 'user' ? 'var(--blue)' : 'var(--bg-secondary)',
                border: msg.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(59,130,246,0.3)' : '0 2px 8px rgba(0,0,0,0.2)',
                fontSize: '15px',
                lineHeight: '1.6',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                wordBreak: 'break-word',
              }}>
                {renderMessageContent(msg.content)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))',
                border: '1px solid rgba(34,211,238,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 12px rgba(34,211,238,0.1)',
                animation: 'glow-pulse 2s infinite',
              }}>
                <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
                  <circle cx="24" cy="24" r="20" stroke="url(#navGl3)" strokeWidth="2"/>
                  <defs><linearGradient id="navGl3" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22D3EE"/><stop offset="100%" stopColor="#3B82F6"/></linearGradient></defs>
                </svg>
              </div>
              <div style={{
                padding: '16px 20px', borderRadius: '16px', borderTopLeftRadius: '4px',
                background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--cyan)', animation: 'pulse 1.5s infinite 0s' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--blue)', animation: 'pulse 1.5s infinite 0.2s' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--purple)', animation: 'pulse 1.5s infinite 0.4s' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      <footer style={{
        padding: '24px',
        display: 'flex', justifyContent: 'center',
        background: 'linear-gradient(to top, rgba(5,8,15,1) 60%, rgba(5,8,15,0))',
        position: 'relative',
        zIndex: 10,
      }}>
        <form onSubmit={handleSubmit} style={{
          width: '100%', maxWidth: '800px',
          position: 'relative',
          display: 'flex', alignItems: 'flex-end',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '8px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(16px)',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => e.currentTarget.style.borderColor = 'rgba(34,211,238,0.5)'}
        onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask GeoNexus AI..."
            rows={1}
            style={{
              flex: 1, background: 'transparent', border: 'none', color: 'var(--text-primary)',
              padding: '12px 16px', fontSize: '15px', resize: 'none', outline: 'none',
              maxHeight: '150px', minHeight: '24px', fontFamily: 'inherit',
            }}
            onInput={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            style={{
              width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
              background: input.trim() && !isLoading ? 'var(--blue)' : 'rgba(255,255,255,0.05)',
              color: input.trim() && !isLoading ? '#fff' : 'var(--text-muted)',
              border: 'none', cursor: input.trim() && !isLoading ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s', margin: '4px',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>
      </footer>
    </div>
  );
}
