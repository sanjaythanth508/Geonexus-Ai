import React from 'react';

export function Button({ 
  children, 
  variant = 'primary', // primary, secondary, outline, ghost, danger
  size = 'md', // sm, md, lg
  className = '', 
  fullWidth = false,
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  ...props 
}) {
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: 'bg-[var(--c-primary-600)] text-white hover:bg-[var(--c-primary-700)] focus:ring-[var(--c-primary-500)] border border-transparent shadow-sm',
    secondary: 'bg-[var(--c-primary-50)] text-[var(--c-primary-900)] hover:bg-[var(--c-primary-100)] focus:ring-[var(--c-primary-500)] border border-transparent',
    outline: 'bg-transparent text-[var(--text-primary)] hover:bg-[var(--c-neutral-50)] focus:ring-[var(--c-neutral-200)] border border-[var(--border-default)]',
    ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--c-neutral-100)] hover:text-[var(--text-primary)] focus:ring-[var(--c-neutral-200)] border border-transparent',
    danger: 'bg-[var(--c-error)] text-white hover:bg-[var(--c-error-dark)] focus:ring-[var(--c-error)] border border-transparent shadow-sm',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const disabledStyles = 'opacity-60 cursor-not-allowed pointer-events-none';
  const widthStyles = fullWidth ? 'w-full' : '';

  const classes = [
    baseStyles,
    variants[variant] || variants.primary,
    sizes[size] || sizes.md,
    widthStyles,
    disabled || loading ? disabledStyles : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {!loading && icon && iconPosition === 'left' && (
        <span className="mr-2 flex items-center">{icon}</span>
      )}
      {children}
      {!loading && icon && iconPosition === 'right' && (
        <span className="ml-2 flex items-center">{icon}</span>
      )}
    </button>
  );
}
