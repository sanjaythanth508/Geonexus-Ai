import React from 'react';

export function Card({ 
  children, 
  className = '', 
  noPadding = false,
  hoverable = false,
  onClick
}) {
  const baseStyles = 'bg-[var(--c-surface)] rounded-xl border border-[var(--border-default)] shadow-sm';
  const hoverStyles = hoverable ? 'transition-all duration-200 hover:shadow-md hover:border-[var(--border-hover)] cursor-pointer' : '';
  const paddingStyles = noPadding ? '' : 'p-5 sm:p-6';

  const classes = [
    baseStyles,
    hoverStyles,
    paddingStyles,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '', title, subtitle, action }) {
  if (title || subtitle || action) {
    return (
      <div className={`flex items-start justify-between mb-4 border-b border-[var(--border-subtle)] pb-4 ${className}`}>
        <div>
          {title && <h3 className="text-lg font-display font-semibold text-[var(--text-primary)]">{title}</h3>}
          {subtitle && <p className="text-sm text-[var(--text-secondary)] mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
    );
  }
  
  return (
    <div className={`mb-4 border-b border-[var(--border-subtle)] pb-4 ${className}`}>
      {children}
    </div>
  );
}

export function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }) {
  return (
    <div className={`mt-4 pt-4 border-t border-[var(--border-subtle)] ${className}`}>
      {children}
    </div>
  );
}
