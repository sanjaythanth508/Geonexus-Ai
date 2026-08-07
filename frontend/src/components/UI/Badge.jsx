import React from 'react';

export function Badge({ 
  children, 
  variant = 'primary', // primary, success, warning, error, neutral
  size = 'md', // sm, md
  className = '' 
}) {
  const baseStyles = 'inline-flex items-center font-semibold rounded-full';
  
  const variants = {
    primary: 'bg-[var(--c-primary-50)] text-[var(--c-primary-700)] border border-[var(--c-primary-200)]',
    success: 'bg-[var(--c-success-light)] text-[var(--c-success-dark)] border border-[var(--c-success)]',
    warning: 'bg-[var(--c-warning-light)] text-[var(--c-warning-dark)] border border-[var(--c-warning)]',
    error: 'bg-[var(--c-error-light)] text-[var(--c-error-dark)] border border-[var(--c-error)]',
    neutral: 'bg-[var(--c-neutral-100)] text-[var(--c-neutral-700)] border border-[var(--c-neutral-300)]',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const classes = [
    baseStyles,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes}>
      {children}
    </span>
  );
}
