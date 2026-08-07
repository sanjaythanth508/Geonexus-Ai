import re

def process_geochat():
    geochat_path = r'B:\Sem4_Project\GeoNexus-AI - Copy\frontend\src\pages\GeoChat.jsx'
    with open(geochat_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = [
        # Sidebar Background
        (r"background: 'rgba\(10, 14, 26, 0.95\)'", "background: 'var(--c-surface-alt)'"),
        (r"borderRight: '1px solid rgba\(255, 255, 255, 0.08\)'", "borderRight: '1px solid var(--border-default)'"),
        
        # New chat button sidebar
        (r"background: 'linear-gradient\(135deg, rgba\(34,211,238,0\.15\), rgba\(59,130,246,0\.15\)\)'", "background: 'var(--c-primary-600)'"),
        (r"border: '1px solid rgba\(34,211,238,0\.3\)'", "border: '1px solid var(--c-primary-700)'"),
        (r"color: '#22d3ee'", "color: '#ffffff'"),
        (r"e\.currentTarget\.style\.background = 'linear-gradient\(135deg, rgba\(34,211,238,0\.25\), rgba\(59,130,246,0\.25\)\)'", "e.currentTarget.style.background = 'var(--c-primary-700)'"),
        (r"e\.currentTarget\.style\.background = 'linear-gradient\(135deg, rgba\(34,211,238,0\.15\), rgba\(59,130,246,0\.15\)\)'", "e.currentTarget.style.background = 'var(--c-primary-600)'"),
        
        # Text colors
        (r"color: 'var\(--text-primary, #f8fafc\)'", "color: 'var(--text-primary)'"),
        (r"color: 'rgba\(255,255,255,0.4\)'", "color: 'var(--text-muted)'"),
        (r"color: 'var\(--text-secondary, #cbd5e1\)'", "color: 'var(--text-secondary)'"),
        (r"color: 'var\(--text-muted, #94a3b8\)'", "color: 'var(--text-muted)'"),
        
        # Recent chats text
        (r"color: isActive \? '#22d3ee' : 'var\(--text-secondary, #cbd5e1\)'", "color: isActive ? 'var(--c-primary-700)' : 'var(--text-secondary)'"),
        (r"border: isActive \? '1px solid rgba\(34, 211, 238, 0.25\)' : '1px solid transparent'", "border: isActive ? '1px solid var(--border-accent)' : '1px solid transparent'"),
        (r"background: isActive \? 'rgba\(34, 211, 238, 0.12\)' : 'transparent'", "background: isActive ? 'var(--c-primary-50)' : 'transparent'"),
        (r"background = 'rgba\(255, 255, 255, 0.04\)'", "background = 'var(--c-surface-hover)'"),
        (r"color: 'rgba\(255,255,255,0.3\)'", "color: 'var(--text-muted)'"),
        
        # User Avatar
        (r"background: 'linear-gradient\(135deg, #3b82f6, #8b5cf6\)'", "background: 'var(--c-primary-600)'"),
        
        # Borders
        (r"borderBottom: '1px solid rgba\(255, 255, 255, 0.06\)'", "borderBottom: '1px solid var(--border-subtle)'"),
        (r"borderTop: '1px solid rgba\(255, 255, 255, 0.06\)'", "borderTop: '1px solid var(--border-subtle)'"),
        
        # Main chat area background
        (r"background: 'var\(--bg-primary, #0a0e1a\)'", "background: 'var(--bg-primary)'"),
        
        # Top Navbar
        (r"background: 'rgba\(10, 14, 26, 0.85\)'", "background: 'var(--c-surface)'"),
        (r"backdropFilter: 'blur\(20px\)',", ""),
        (r"borderBottom: '1px solid rgba\(255, 255, 255, 0.08\)'", "borderBottom: '1px solid var(--border-default)'"),
        (r"color: '#22d3ee'", "color: 'var(--c-primary-700)'"),
        (r"color: '#f8fafc'", "color: 'var(--text-primary)'"),
        
        # History button
        (r"border: '1px solid rgba\(255, 255, 255, 0.1\)'", "border: '1px solid var(--border-default)'"),
        (r"background: 'rgba\(255, 255, 255, 0.04\)'", "background: 'var(--c-surface-hover)'"),
        
        # Avatar user
        (r"background: msg.role === 'user'\s*\? 'linear-gradient\(135deg, #3b82f6, #1d4ed8\)'\s*: 'linear-gradient\(135deg, rgba\(34,211,238,0.2\), rgba\(59,130,246,0.2\)\)'", "background: msg.role === 'user' ? 'var(--c-primary-600)' : 'var(--c-surface)'"),
        (r"border: `1px solid \$\{msg.role === 'user' \? 'rgba\(59,130,246,0.4\)' : 'rgba\(34,211,238,0.35\)'\}`", "border: `1px solid ${msg.role === 'user' ? 'transparent' : 'var(--border-default)'}`"),
        (r"boxShadow: msg.role === 'assistant' \? '0 0 12px rgba\(34,211,238,0.15\)' : 'none'", "boxShadow: msg.role === 'assistant' ? 'var(--shadow-sm)' : 'none'"),
        (r'stroke="#22d3ee"', 'stroke="var(--c-primary-600)"'),

        # Message Bubble
        (r"background: msg.role === 'user'\s*\? 'linear-gradient\(135deg, #2563eb, #1d4ed8\)'\s*: 'rgba\(255, 255, 255, 0.03\)'", "background: msg.role === 'user' ? 'var(--c-primary-50)' : 'var(--c-surface)'"),
        (r"border: msg.role === 'user' \? 'none' : '1px solid rgba\(255, 255, 255, 0.08\)'", "border: msg.role === 'user' ? '1px solid var(--c-primary-200)' : '1px solid var(--border-default)'"),
        (r"color: msg.role === 'user' \? '#fff' : 'var\(--text-primary, #f8fafc\)'", "color: msg.role === 'user' ? 'var(--text-primary)' : 'var(--text-primary)'"),
        (r"boxShadow: msg.role === 'user'\s*\? '0 4px 14px rgba\(37,99,235,0.3\)'\s*: '0 4px 20px rgba\(0, 0, 0, 0.25\)'", "boxShadow: msg.role === 'user' ? 'var(--shadow-sm)' : 'var(--shadow-sm)'"),

        # Streaming pulse
        (r"background: '#22d3ee'", "background: 'var(--c-primary-500)'"),
        
        # Copy button
        (r"borderTop: '1px solid rgba\(255, 255, 255, 0.05\)'", "borderTop: '1px solid var(--border-subtle)'"),
        
        # Loading animation
        (r"background: 'linear-gradient\(135deg, rgba\(34,211,238,0.2\), rgba\(59,130,246,0.2\)\)'", "background: 'var(--c-surface)'"),
        (r"border: '1px solid rgba\(34,211,238,0.35\)'", "border: '1px solid var(--border-default)'"),
        (r"background: 'rgba\(255, 255, 255, 0.03\)'", "background: 'var(--c-surface)'"),
        (r"background: '#3b82f6'", "background: 'var(--c-primary-500)'"),
        (r"background: '#8b5cf6'", "background: 'var(--c-primary-600)'"),
        
        # Input Area Footer
        (r"background: 'linear-gradient\(to top, rgba\(10,14,26,1\) 80%, rgba\(10,14,26,0\)\)'", "background: 'var(--c-surface)'"),
        
        # Stop Generating Button
        (r"background: 'rgba\(15, 23, 42, 0.9\)'", "background: 'var(--c-surface)'"),
        (r"border: '1px solid rgba\(255, 255, 255, 0.15\)'", "border: '1px solid var(--border-default)'"),
        (r"color: '#f8fafc'", "color: 'var(--text-primary)'"),
        (r"boxShadow: '0 4px 12px rgba\(0,0,0,0.3\)'", "boxShadow: 'var(--shadow-md)'"),
        (r"background: '#ef4444'", "background: 'var(--c-danger)'"),
        
        # Quick Prompts
        (r"background: 'rgba\(255, 255, 255, 0.04\)'", "background: 'var(--c-neutral-100)'"),
        (r"color: 'var\(--text-secondary, #cbd5e1\)'", "color: 'var(--text-secondary)'"),
        (r"e\.currentTarget\.style\.borderColor = '#22d3ee'", "e.currentTarget.style.borderColor = 'var(--c-primary-300)'"),
        (r"e\.currentTarget\.style\.color = '#22d3ee'", "e.currentTarget.style.color = 'var(--c-primary-700)'"),
        (r"e\.currentTarget\.style\.background = 'rgba\(34, 211, 238, 0.06\)'", "e.currentTarget.style.background = 'var(--c-primary-50)'"),
        (r"e\.currentTarget\.style\.borderColor = 'rgba\(255, 255, 255, 0.08\)'", "e.currentTarget.style.borderColor = 'transparent'"),
        (r"e\.currentTarget\.style\.color = 'var\(--text-secondary, #cbd5e1\)'", "e.currentTarget.style.color = 'var(--text-secondary)'"),

        # Main Input Box
        (r"border: '1px solid rgba\(255, 255, 255, 0.1\)'", "border: '1px solid var(--border-default)'"),
        (r"boxShadow: '0 8px 32px rgba\(0, 0, 0, 0.35\)'", "boxShadow: 'var(--shadow-md)'"),
        (r"backdropFilter: 'blur\(16px\)',", ""),
        (r"e\.currentTarget\.style\.borderColor = 'rgba\(34, 211, 238, 0.5\)'", "e.currentTarget.style.borderColor = 'var(--c-primary-400)'"),
        (r"e\.currentTarget\.style\.borderColor = 'rgba\(255, 255, 255, 0.1\)'", "e.currentTarget.style.borderColor = 'var(--border-default)'"),
        
        # Submit button
        (r"background: input\.trim\(\) && !isLoading && !isStreaming\s*\? 'linear-gradient\(135deg, #22d3ee, #3b82f6\)'\s*: 'rgba\(255, 255, 255, 0.06\)'", "background: input.trim() && !isLoading && !isStreaming ? 'var(--c-primary-600)' : 'var(--c-neutral-100)'"),
        (r"color: input\.trim\(\) && !isLoading && !isStreaming \? '#0f172a' : 'rgba\(255, 255, 255, 0.3\)'", "color: input.trim() && !isLoading && !isStreaming ? '#ffffff' : 'var(--text-muted)'"),
        
        # Footer text
        (r"color: 'rgba\(255, 255, 255, 0.35\)'", "color: 'var(--text-muted)'"),
    ]

    for pat, repl in replacements:
        content = re.sub(pat, repl, content)

    with open(geochat_path, 'w', encoding='utf-8') as f:
        f.write(content)


def process_parser():
    parser_path = r'B:\Sem4_Project\GeoNexus-AI - Copy\frontend\src\utils\markdownParser.jsx'
    with open(parser_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = [
        # Table wrapper
        (r"border: '1px solid rgba\(255, 255, 255, 0.1\)'", "border: '1px solid var(--border-default)'"),
        (r"background: 'rgba\(15, 23, 42, 0.6\)'", "background: 'var(--c-surface)'"),
        
        # Table Header
        (r"background: 'rgba\(34, 211, 238, 0.1\)'", "background: 'var(--c-surface-hover)'"),
        (r"borderBottom: '1px solid rgba\(34, 211, 238, 0.25\)'", "borderBottom: '1px solid var(--border-default)'"),
        (r"color: '#22d3ee'", "color: 'var(--text-primary)'"),
        
        # Table Rows
        (r"borderBottom: rIdx === tableRows\.length - 1 \? 'none' : '1px solid rgba\(255, 255, 255, 0.05\)'", "borderBottom: rIdx === tableRows.length - 1 ? 'none' : '1px solid var(--border-subtle)'"),
        (r"background: rIdx % 2 === 1 \? 'rgba\(255, 255, 255, 0.02\)' : 'transparent'", "background: rIdx % 2 === 1 ? 'var(--c-surface-hover)' : 'transparent'"),
        
        # Code block
        (r"background: 'rgba\(10, 15, 30, 0.95\)'", "background: 'var(--c-neutral-50)'"),
        (r"color: '#38bdf8'", "color: 'var(--text-primary)'"),
        
        # HR
        (r"borderTop: '1px solid rgba\(255, 255, 255, 0.1\)'", "borderTop: '1px solid var(--border-default)'"),
        
        # Blockquote
        (r"borderLeft: '3px solid #22d3ee'", "borderLeft: '3px solid var(--c-primary-50)'"),
        (r"background: 'rgba\(34, 211, 238, 0.06\)'", "background: 'var(--c-surface-alt)'"),
        
        # Inline code
        (r"background: 'rgba\(255, 255, 255, 0.08\)'", "background: 'var(--c-neutral-100)'"),
        (r"border: '1px solid rgba\(34, 211, 238, 0.2\)'", "border: '1px solid var(--border-subtle)'"),
    ]

    for pat, repl in replacements:
        content = re.sub(pat, repl, content)

    with open(parser_path, 'w', encoding='utf-8') as f:
        f.write(content)

if __name__ == '__main__':
    process_geochat()
    process_parser()
    print('Done.')
