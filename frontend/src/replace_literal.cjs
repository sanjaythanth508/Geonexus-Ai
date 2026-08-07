const fs = require('fs');

const geochatPath = 'B:\\Sem4_Project\\GeoNexus-AI - Copy\\frontend\\src\\pages\\GeoChat.jsx';
let content = fs.readFileSync(geochatPath, 'utf8');

const replacements = [
  ["background: 'rgba(10, 14, 26, 0.95)'", "background: 'var(--c-surface-alt)'"],
  ["borderRight: '1px solid rgba(255, 255, 255, 0.08)'", "borderRight: '1px solid var(--border-default)'"],
  ["background: 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))'", "background: 'var(--c-primary-600)'"],
  ["border: '1px solid rgba(34,211,238,0.3)'", "border: '1px solid var(--c-primary-700)'"],
  ["color: '#22d3ee'", "color: '#ffffff'"],
  ["e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.25), rgba(59,130,246,0.25))'", "e.currentTarget.style.background = 'var(--c-primary-700)'"],
  ["e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34,211,238,0.15), rgba(59,130,246,0.15))'", "e.currentTarget.style.background = 'var(--c-primary-600)'"],
  ["color: 'var(--text-primary, #f8fafc)'", "color: 'var(--text-primary)'"],
  ["color: 'rgba(255,255,255,0.4)'", "color: 'var(--text-muted)'"],
  ["color: 'var(--text-secondary, #cbd5e1)'", "color: 'var(--text-secondary)'"],
  ["color: 'var(--text-muted, #94a3b8)'", "color: 'var(--text-muted)'"],
  ["color: isActive ? '#22d3ee' : 'var(--text-secondary, #cbd5e1)'", "color: isActive ? 'var(--c-primary-700)' : 'var(--text-secondary)'"],
  ["border: isActive ? '1px solid rgba(34, 211, 238, 0.25)' : '1px solid transparent'", "border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent'"],
  ["background: isActive ? 'rgba(34, 211, 238, 0.12)' : 'transparent'", "background: isActive ? 'var(--c-primary-50)' : 'transparent'"],
  ["e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'", "e.currentTarget.style.background = 'var(--c-surface-hover)'"],
  ["color: 'rgba(255,255,255,0.3)'", "color: 'var(--text-muted)'"],
  ["background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)'", "background: 'var(--c-primary-600)'"],
  ["borderBottom: '1px solid rgba(255, 255, 255, 0.06)'", "borderBottom: '1px solid var(--border-subtle)'"],
  ["borderTop: '1px solid rgba(255, 255, 255, 0.06)'", "borderTop: '1px solid var(--border-subtle)'"],
  ["background: 'var(--bg-primary, #0a0e1a)'", "background: 'var(--bg-primary)'"],
  ["background: 'rgba(10, 14, 26, 0.85)'", "background: 'var(--c-surface)'"],
  ["backdropFilter: 'blur(20px)',", ""],
  ["borderBottom: '1px solid rgba(255, 255, 255, 0.08)'", "borderBottom: '1px solid var(--border-default)'"],
  ["border: '1px solid rgba(255, 255, 255, 0.1)'", "border: '1px solid var(--border-default)'"],
  ["background: 'rgba(255, 255, 255, 0.04)'", "background: 'var(--c-surface)'"],
  ["background: msg.role === 'user'\n                      ? 'linear-gradient(135deg, #2563eb, #1d4ed8)'\n                      : 'rgba(255, 255, 255, 0.03)'", "background: msg.role === 'user' ? 'var(--c-primary-50)' : 'var(--c-surface)'"],
  ["border: msg.role === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.08)'", "border: msg.role === 'user' ? '1px solid var(--c-primary-200)' : '1px solid var(--border-default)'"],
  ["boxShadow: msg.role === 'user'\n                      ? '0 4px 14px rgba(37,99,235,0.3)'\n                      : '0 4px 20px rgba(0, 0, 0, 0.25)'", "boxShadow: msg.role === 'user' ? 'none' : 'var(--shadow-sm)'"],
  ['stroke="#22d3ee"', 'stroke="var(--c-primary-600)"'],
  ["background: '#22d3ee'", "background: 'var(--c-primary-500)'"],
  ["borderTop: '1px solid rgba(255, 255, 255, 0.05)'", "borderTop: '1px solid var(--border-subtle)'"],
  ["background: 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))'", "background: 'var(--c-surface)'"],
  ["border: '1px solid rgba(34,211,238,0.35)'", "border: '1px solid var(--border-default)'"],
  ["background: 'rgba(255, 255, 255, 0.03)'", "background: 'var(--c-surface)'"],
  ["background: '#3b82f6'", "background: 'var(--c-primary-500)'"],
  ["background: '#8b5cf6'", "background: 'var(--c-primary-600)'"],
  ["background: 'linear-gradient(to top, rgba(10,14,26,1) 80%, rgba(10,14,26,0))'", "background: 'var(--c-surface)'"],
  ["background: 'rgba(15, 23, 42, 0.9)'", "background: 'var(--c-surface)'"],
  ["border: '1px solid rgba(255, 255, 255, 0.15)'", "border: '1px solid var(--border-default)'"],
  ["color: '#f8fafc'", "color: 'var(--text-primary)'"],
  ["boxShadow: '0 4px 12px rgba(0,0,0,0.3)'", "boxShadow: 'var(--shadow-md)'"],
  ["background: '#ef4444'", "background: 'var(--c-danger)'"],
  ["e.currentTarget.style.borderColor = '#22d3ee'", "e.currentTarget.style.borderColor = 'var(--c-primary-300)'"],
  ["e.currentTarget.style.color = '#22d3ee'", "e.currentTarget.style.color = 'var(--c-primary-700)'"],
  ["e.currentTarget.style.background = 'rgba(34, 211, 238, 0.06)'", "e.currentTarget.style.background = 'var(--c-primary-50)'"],
  ["e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)'", "e.currentTarget.style.borderColor = 'transparent'"],
  ["e.currentTarget.style.color = 'var(--text-secondary, #cbd5e1)'", "e.currentTarget.style.color = 'var(--text-secondary)'"],
  ["boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)'", "boxShadow: 'var(--shadow-md)'"],
  ["backdropFilter: 'blur(16px)',", ""],
  ["e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.5)'", "e.currentTarget.style.borderColor = 'var(--c-primary-400)'"],
  ["e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'", "e.currentTarget.style.borderColor = 'var(--border-default)'"],
  ["background: input.trim() && !isLoading && !isStreaming\n                  ? 'linear-gradient(135deg, #22d3ee, #3b82f6)'\n                  : 'rgba(255, 255, 255, 0.06)'", "background: input.trim() && !isLoading && !isStreaming ? 'var(--c-primary-600)' : 'var(--c-neutral-100)'"],
  ["color: input.trim() && !isLoading && !isStreaming ? '#0f172a' : 'rgba(255, 255, 255, 0.3)'", "color: input.trim() && !isLoading && !isStreaming ? '#ffffff' : 'var(--text-muted)'"],
  ["color: 'rgba(255, 255, 255, 0.35)'", "color: 'var(--text-muted)'"],
  ["border: `1px solid ${msg.role === 'user' ? 'rgba(59,130,246,0.4)' : 'rgba(34,211,238,0.35)'}`", "border: `1px solid ${msg.role === 'user' ? 'transparent' : 'var(--border-default)'}`"],
  ["background: msg.role === 'user'\n                    ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)'\n                    : 'linear-gradient(135deg, rgba(34,211,238,0.2), rgba(59,130,246,0.2))'", "background: msg.role === 'user' ? 'var(--c-primary-600)' : 'var(--c-surface)'"],
  ["boxShadow: msg.role === 'assistant' ? '0 0 12px rgba(34,211,238,0.15)' : 'none'", "boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none'"]
];

for (const [search, replace] of replacements) {
  content = content.split(search).join(replace);
}
fs.writeFileSync(geochatPath, content);

const parserPath = 'B:\\Sem4_Project\\GeoNexus-AI - Copy\\frontend\\src\\utils\\markdownParser.jsx';
let contentParser = fs.readFileSync(parserPath, 'utf8');

const parserReplacements = [
  ["border: '1px solid rgba(255, 255, 255, 0.1)'", "border: '1px solid var(--border-default)'"],
  ["background: 'rgba(15, 23, 42, 0.6)'", "background: 'var(--c-surface)'"],
  ["background: 'rgba(34, 211, 238, 0.1)'", "background: 'var(--c-surface-hover)'"],
  ["borderBottom: '1px solid rgba(34, 211, 238, 0.25)'", "borderBottom: '1px solid var(--border-default)'"],
  ["color: '#22d3ee'", "color: 'var(--text-primary)'"],
  ["borderBottom: rIdx === tableRows.length - 1 ? 'none' : '1px solid rgba(255, 255, 255, 0.05)'", "borderBottom: rIdx === tableRows.length - 1 ? 'none' : '1px solid var(--border-subtle)'"],
  ["background: rIdx % 2 === 1 ? 'rgba(255, 255, 255, 0.02)' : 'transparent'", "background: rIdx % 2 === 1 ? 'var(--c-surface-hover)' : 'transparent'"],
  ["background: 'rgba(10, 15, 30, 0.95)'", "background: 'var(--c-neutral-50)'"],
  ["color: '#38bdf8'", "color: 'var(--text-primary)'"],
  ["borderTop: '1px solid rgba(255, 255, 255, 0.1)'", "borderTop: '1px solid var(--border-default)'"],
  ["borderLeft: '3px solid #22d3ee'", "borderLeft: '3px solid var(--c-primary-50)'"],
  ["background: 'rgba(34, 211, 238, 0.06)'", "background: 'var(--c-surface-alt)'"],
  ["background: 'rgba(255, 255, 255, 0.08)'", "background: 'var(--c-neutral-100)'"],
  ["border: '1px solid rgba(34, 211, 238, 0.2)'", "border: '1px solid var(--border-subtle)'"]
];

for (const [search, replace] of parserReplacements) {
  contentParser = contentParser.split(search).join(replace);
}
fs.writeFileSync(parserPath, contentParser);

console.log('Script done.');
