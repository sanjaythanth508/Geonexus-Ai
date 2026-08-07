import React, { forwardRef } from 'react';

export const Input = forwardRef(({ 
  label, 
  error, 
  helperText, 
  id, 
  className = '', 
  containerClassName = '',
  icon,
  iconPosition = 'left',
  ...props 
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substring(2, 9)}`;
  
  const baseInputStyles = 'block w-full rounded-md border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:cursor-not-allowed disabled:bg-[var(--c-neutral-50)] disabled:text-[var(--text-muted)]';
  
  const defaultInputStyles = 'border-[var(--border-default)] bg-[var(--bg-primary)] text-[var(--text-primary)] hover:border-[var(--border-hover)] focus:border-[var(--c-primary-500)] focus:ring-[var(--c-primary-100)]';
  const errorInputStyles = 'border-[var(--c-error)] bg-[var(--c-error-light)] text-[var(--c-error-dark)] focus:border-[var(--c-error)] focus:ring-[var(--c-error-light)]';

  const paddingStyles = icon ? (iconPosition === 'left' ? 'pl-10 pr-3 py-2' : 'pl-3 pr-10 py-2') : 'px-3 py-2';

  const inputClasses = [
    baseInputStyles,
    error ? errorInputStyles : defaultInputStyles,
    paddingStyles,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={`w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-semibold text-[var(--text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            {icon}
          </div>
        )}
        
        <input 
          ref={ref}
          id={inputId}
          className={inputClasses}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[var(--text-muted)]">
            {icon}
          </div>
        )}
      </div>

      {(error || helperText) && (
        <p className={`mt-1.5 text-xs ${error ? 'text-[var(--c-error)] font-medium' : 'text-[var(--text-muted)]'}`}>
          {error || helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
