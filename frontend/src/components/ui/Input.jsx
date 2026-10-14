import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Standard Sandstone Input Component
 * Features:
 * - Proper label pairing with htmlFor
 * - Inline error presentation with aria-invalid & aria-describedby
 * - Prefix icon support
 * - Refined warm Sandstone focus state in light & dark mode
 */
export function Input({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  error,
  helperText,
  icon: Icon,
  disabled = false,
  required = false,
  className = '',
  name,
  min,
  max,
  step,
  autoComplete,
  ...props
}) {
  const inputId = id || (name ? `input-${name}` : undefined);
  const errorId = inputId ? `${inputId}-error` : undefined;
  const helperId = inputId ? `${inputId}-helper` : undefined;

  const safeValue = value !== undefined && value !== null ? value : '';

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-bold text-[#17251F] dark:text-[#F7EFE4] flex items-center justify-between tracking-wide"
        >
          <span>
            {label}
            {required && <span className="text-[#C53030] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-[#657168] dark:text-[#9FB29E] shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={inputId}
          name={name}
          type={type}
          value={safeValue}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          min={min}
          max={max}
          step={step}
          autoComplete={autoComplete}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          className={`
            w-full rounded-xl text-xs sm:text-sm text-[#17251F] dark:text-[#F7EFE4] placeholder-[#8D9890] dark:placeholder-[#657168] transition-all duration-150
            bg-[#FFFDF9] dark:bg-[#111D1A] border py-2.5 outline-none
            ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}
            ${error
              ? 'border-[#C53030] focus:border-[#C53030] focus:ring-1 focus:ring-[#C53030] bg-[#FDF0ED]/50'
              : 'border-[#E4DCD0] dark:border-[#233630] hover:border-[#173F36]/40 dark:hover:border-[#3B574E] focus:border-[#173F36] dark:focus:border-[#4EBA87] focus:ring-2 focus:ring-[#173F36]/15 dark:focus:ring-[#4EBA87]/20 focus:bg-[#FFFDF9] dark:focus:bg-[#14221E]'
            }
            disabled:bg-[#F4ECE0] dark:disabled:bg-[#0E1815] disabled:text-[#A0ABA2] dark:disabled:text-[#5A6D63] disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-[#C53030] flex items-center gap-1 font-medium mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
