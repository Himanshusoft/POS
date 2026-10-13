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
          className="text-xs font-bold text-[#1F2937] dark:text-[#F7F3EC] flex items-center justify-between"
        >
          <span>
            {label}
            {required && <span className="text-[#DC2626] ml-1">*</span>}
          </span>
        </label>
      )}

      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3.5 pointer-events-none text-[#5B6470] dark:text-[#A89B8C] shrink-0">
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
            w-full rounded-xl text-xs sm:text-sm text-[#1F2937] dark:text-[#F7F3EC] placeholder-[#9CA3AF] dark:placeholder-[#73685C] transition-all duration-150
            bg-[#FAF7F2] dark:bg-[#181512] border py-2.5 outline-none
            ${Icon ? 'pl-10 pr-3.5' : 'px-3.5'}
            ${error
              ? 'border-[#DC2626] focus:border-[#DC2626] focus:ring-1 focus:ring-[#DC2626] bg-rose-50/20'
              : 'border-[#E5D8C6] dark:border-[#382F26] hover:border-[#D9C3A5] dark:hover:border-[#524436] focus:border-[#92400E] dark:focus:border-[#D97706] focus:ring-1 focus:ring-[#92400E] dark:focus:ring-[#D97706] focus:bg-white dark:focus:bg-[#201C18]'
            }
            disabled:bg-gray-100 dark:disabled:bg-[#161310] disabled:text-gray-400 dark:disabled:text-[#524436] disabled:cursor-not-allowed
          `}
          {...props}
        />
      </div>

      {error ? (
        <p id={errorId} className="text-xs text-[#DC2626] flex items-center gap-1 font-medium mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-[#5B6470] dark:text-[#A89B8C] mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default Input;
