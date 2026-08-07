import React from 'react';

/**
 * Parses markdown text into rich React elements supporting:
 * - Tables with alignments and responsive scroll wrappers
 * - Headers (h3, h4, h5)
 * - Blockquotes
 * - Unordered and ordered lists
 * - Inline code, bold, italic
 * - Horizontal rules
 */
export function renderMarkdownToReact(text) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let inTable = false;
  let tableHeader = [];
  let tableAlignments = [];
  let tableRows = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';

  const flushTable = (key) => {
    if (tableHeader.length > 0 || tableRows.length > 0) {
      elements.push(
        <div key={`table-wrap-${key}`} className="geochat-table-wrapper" style={{
          overflowX: 'auto',
          margin: '14px 0',
          borderRadius: '10px',
          border: '1px solid var(--border-default)',
          background: 'var(--c-surface)'
        }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13.5px',
            lineHeight: '1.5',
            textAlign: 'left'
          }}>
            {tableHeader.length > 0 && (
              <thead style={{ background: 'var(--c-surface-hover)', borderBottom: '1px solid var(--border-default)' }}>
                <tr>
                  {tableHeader.map((th, thIdx) => (
                    <th
                      key={`th-${thIdx}`}
                      style={{
                        padding: '10px 14px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                        textAlign: tableAlignments[thIdx] || 'left',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {formatInlineMarkdown(th)}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rIdx) => (
                <tr
                  key={`tr-${rIdx}`}
                  style={{
                    borderBottom: rIdx === tableRows.length - 1 ? 'none' : '1px solid var(--border-subtle)',
                    background: rIdx % 2 === 1 ? 'var(--c-surface-hover)' : 'transparent'
                  }}
                >
                  {row.map((cell, cIdx) => (
                    <td
                      key={`td-${cIdx}`}
                      style={{
                        padding: '10px 14px',
                        color: 'var(--text-primary)',
                        textAlign: tableAlignments[cIdx] || 'left'
                      }}
                    >
                      {formatInlineMarkdown(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    inTable = false;
    tableHeader = [];
    tableAlignments = [];
    tableRows = [];
  };

  const flushCodeBlock = (key) => {
    if (codeLines.length > 0) {
      elements.push(
        <pre key={`code-${key}`} style={{
          background: 'var(--c-neutral-50)',
          border: '1px solid var(--border-default)',
          padding: '12px 16px',
          borderRadius: '8px',
          overflowX: 'auto',
          margin: '12px 0',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '13px',
          color: 'var(--text-primary)'
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    }
    inCodeBlock = false;
    codeLines = [];
    codeLang = '';
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Code block detection
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        if (inTable) flushTable(i);
        inCodeBlock = true;
        codeLang = trimmed.slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // Markdown Table row detection
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map(c => c.trim());

      // Check if it's separator row: | :--- | :---: | ---: |
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));

      if (isSeparator) {
        tableAlignments = cells.map(c => {
          if (c.startsWith(':') && c.endsWith(':')) return 'center';
          if (c.endsWith(':')) return 'right';
          return 'left';
        });
      } else if (!inTable && tableHeader.length === 0) {
        inTable = true;
        tableHeader = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    } else if (inTable) {
      flushTable(i);
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      elements.push(
        <hr key={`hr-${i}`} style={{
          border: 'none',
          borderTop: '1px solid var(--border-default)',
          margin: '16px 0'
        }} />
      );
      continue;
    }

    // Headings
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={`h3-${i}`} style={{
          fontSize: '16.5px',
          fontWeight: '700',
          color: 'var(--text-primary)',
          margin: '16px 0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {formatInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={`h4-${i}`} style={{
          fontSize: '14.5px',
          fontWeight: '600',
          color: 'var(--text-primary)',
          margin: '14px 0 6px'
        }}>
          {formatInlineMarkdown(trimmed.slice(5))}
        </h4>
      );
      continue;
    }

    if (trimmed.startsWith('##### ')) {
      elements.push(
        <h5 key={`h5-${i}`} style={{
          fontSize: '13.5px',
          fontWeight: '600',
          color: 'var(--text-secondary)',
          margin: '12px 0 4px'
        }}>
          {formatInlineMarkdown(trimmed.slice(6))}
        </h5>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={`bq-${i}`} style={{
          borderLeft: '3px solid var(--c-primary-500)',
          background: 'var(--c-surface-alt)',
          padding: '10px 14px',
          margin: '10px 0',
          borderRadius: '0 8px 8px 0',
          color: 'var(--text-primary)',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          {formatInlineMarkdown(trimmed.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const indentLevel = line.search(/\S/) >= 2 ? 24 : 8;
      elements.push(
        <div key={`li-${i}`} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          paddingLeft: `${indentLevel}px`,
          margin: '4px 0',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <span style={{ color: 'var(--text-primary)', marginTop: '2px' }}>•</span>
          <span style={{ flex: 1 }}>{formatInlineMarkdown(trimmed.slice(2))}</span>
        </div>
      );
      continue;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (numMatch) {
      elements.push(
        <div key={`numli-${i}`} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '8px',
          paddingLeft: '8px',
          margin: '4px 0',
          fontSize: '14px',
          lineHeight: '1.6'
        }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: '600', minWidth: '18px' }}>{numMatch[1]}.</span>
          <span style={{ flex: 1 }}>{formatInlineMarkdown(numMatch[2])}</span>
        </div>
      );
      continue;
    }

    // Regular paragraphs / empty lines
    if (trimmed === '') {
      elements.push(<div key={`empty-${i}`} style={{ height: '8px' }} />);
    } else {
      elements.push(
        <p key={`p-${i}`} style={{
          margin: '6px 0',
          fontSize: '14px',
          lineHeight: '1.65',
          color: 'var(--text-primary)'
        }}>
          {formatInlineMarkdown(trimmed)}
        </p>
      );
    }
  }

  if (inTable) flushTable(lines.length);
  if (inCodeBlock) flushCodeBlock(lines.length);

  return elements;
}

/**
 * Formats inline bold, italic, code, and markdown links
 */
export function formatInlineMarkdown(text) {
  if (!text) return '';

  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\*.*?\*)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code key={`c-${match.index}`} style={{
          background: 'var(--c-neutral-100)',
          color: 'var(--text-primary)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontSize: '12.5px',
          fontFamily: 'var(--font-mono, monospace)',
          border: '1px solid var(--border-subtle)'
        }}>
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(
        <em key={`i-${match.index}`} style={{ fontStyle: 'italic', color: 'var(--text-secondary)' }}>
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}
