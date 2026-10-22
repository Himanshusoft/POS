import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ChevronDown, Search, Check, AlertCircle, X } from 'lucide-react';
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  getCountryByCode,
  parsePhoneNumber,
  validatePhoneNumber,
  sanitizePhoneDigits,
} from '../../utils/countryPhoneData';

/**
 * Standard Sandstone Country-Aware Phone Input Component
 *
 * Features:
 * - Searchable country dropdown with name, flag, and dial code
 * - Numeric digits only in national phone input
 * - Revalidates dynamically on country change or typing
 * - Accessible listbox with keyboard navigation
 * - Preserves leading zeros
 * - Light and dark mode support aligned with ApexPOS design tokens
 */
export function PhoneInput({
  id,
  name,
  label,
  value = '',
  country: controlledCountry,
  defaultCountry = DEFAULT_COUNTRY,
  onChange,
  onCountryChange,
  error: externalError,
  helperText,
  required = false,
  disabled = false,
  placeholder,
  className = '',
  autoFocus = false,
}) {
  // Parse incoming value to detect if country code is embedded (e.g. +1 555-0101)
  const initialParsed = useMemo(() => {
    return parsePhoneNumber(value, controlledCountry || defaultCountry);
  }, [value, controlledCountry, defaultCountry]);

  // Selected country state
  const [selectedCountryCode, setSelectedCountryCode] = useState(() => {
    return controlledCountry || initialParsed.countryCode || defaultCountry;
  });

  // National digits state
  const [nationalNumber, setNationalNumber] = useState(() => {
    return initialParsed.nationalNumber || '';
  });

  // Dropdown open/close & search query state
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [touched, setTouched] = useState(false);

  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const phoneInputRef = useRef(null);
  const listRef = useRef(null);

  const currentCountry = useMemo(() => {
    return getCountryByCode(selectedCountryCode) || getCountryByCode(DEFAULT_COUNTRY);
  }, [selectedCountryCode]);

  // Sync internal state when external value or controlledCountry changes
  useEffect(() => {
    const parsed = parsePhoneNumber(value, controlledCountry || selectedCountryCode);
    if (controlledCountry && controlledCountry !== selectedCountryCode) {
      setSelectedCountryCode(controlledCountry);
    } else if (value && value.startsWith('+') && parsed.countryCode !== selectedCountryCode) {
      setSelectedCountryCode(parsed.countryCode);
    }
    setNationalNumber(parsed.nationalNumber);
  }, [value, controlledCountry]);

  // Compute inline validation error
  const internalValidation = useMemo(() => {
    return validatePhoneNumber(nationalNumber, selectedCountryCode, { required });
  }, [nationalNumber, selectedCountryCode, required]);

  const displayError = externalError !== undefined ? externalError : (touched ? internalValidation.error : '');

  // Filter countries by search query
  const filteredCountries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return COUNTRIES;
    const cleanQ = q.replace(/[+\s-]/g, '');
    return COUNTRIES.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const isoMatch = c.iso2.toLowerCase().includes(q);
      const dialClean = c.dialCode.replace(/\D/g, '');
      const dialMatch = c.dialCode.includes(q) || dialClean.startsWith(cleanQ);
      return nameMatch || isoMatch || dialMatch;
    });
  }, [searchQuery]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setHighlightedIndex(0);
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Select country handler
  const handleSelectCountry = (country) => {
    setSelectedCountryCode(country.iso2);
    setIsOpen(false);
    if (onCountryChange) {
      onCountryChange(country.iso2);
    }

    // Revalidate existing national digits with newly selected country
    const validation = validatePhoneNumber(nationalNumber, country.iso2, { required });
    const fullFormatted = nationalNumber ? `${country.dialCode} ${nationalNumber}` : '';

    if (onChange) {
      onChange(fullFormatted, {
        nationalNumber,
        countryCode: country.iso2,
        dialCode: country.dialCode,
        isValid: validation.isValid,
        error: validation.error,
      });
    }

    // Refocus phone digits input
    setTimeout(() => {
      phoneInputRef.current?.focus();
    }, 50);
  };

  // Keyboard navigation for country list
  const handleDropdownKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      phoneInputRef.current?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredCountries.length ? prev + 1 : 0));
      scrollHighlightedIntoView(highlightedIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCountries.length - 1));
      scrollHighlightedIntoView(highlightedIndex - 1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCountries[highlightedIndex]) {
        handleSelectCountry(filteredCountries[highlightedIndex]);
      }
    }
  };

  const scrollHighlightedIntoView = (index) => {
    if (!listRef.current) return;
    const items = listRef.current.children;
    if (items[index]) {
      items[index].scrollIntoView({ block: 'nearest' });
    }
  };

  // Phone input typing handler (digits only)
  const handleDigitsChange = (e) => {
    const raw = e.target.value;
    const digitsOnly = sanitizePhoneDigits(raw);
    setNationalNumber(digitsOnly);
    setTouched(true);

    const validation = validatePhoneNumber(digitsOnly, selectedCountryCode, { required });
    const fullFormatted = digitsOnly ? `${currentCountry.dialCode} ${digitsOnly}` : '';

    if (onChange) {
      onChange(fullFormatted, {
        nationalNumber: digitsOnly,
        countryCode: selectedCountryCode,
        dialCode: currentCountry.dialCode,
        isValid: validation.isValid,
        error: validation.error,
      });
    }
  };

  // Prevent non-digit keystrokes except navigation/editing
  const handleKeyDown = (e) => {
    const allowedKeys = [
      'Backspace',
      'Delete',
      'Tab',
      'Escape',
      'Enter',
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'Home',
      'End',
    ];
    if (
      allowedKeys.includes(e.key) ||
      (e.ctrlKey || e.metaKey) // Allow copy/paste/select-all
    ) {
      return;
    }
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  // Handle pasted values: strip disallowed characters or detect country if pasted with '+'
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    const trimmed = pastedText.trim();
    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumber(trimmed, selectedCountryCode);
      setSelectedCountryCode(parsed.countryCode);
      setNationalNumber(parsed.nationalNumber);
      setTouched(true);

      const validation = validatePhoneNumber(parsed.nationalNumber, parsed.countryCode, { required });
      const fullFormatted = parsed.nationalNumber ? `${parsed.dialCode} ${parsed.nationalNumber}` : '';
      if (onChange) {
        onChange(fullFormatted, {
          nationalNumber: parsed.nationalNumber,
          countryCode: parsed.countryCode,
          dialCode: parsed.dialCode,
          isValid: validation.isValid,
          error: validation.error,
        });
      }
    } else {
      const digitsOnly = sanitizePhoneDigits(pastedText);
      setNationalNumber(digitsOnly);
      setTouched(true);

      const validation = validatePhoneNumber(digitsOnly, selectedCountryCode, { required });
      const fullFormatted = digitsOnly ? `${currentCountry.dialCode} ${digitsOnly}` : '';
      if (onChange) {
        onChange(fullFormatted, {
          nationalNumber: digitsOnly,
          countryCode: selectedCountryCode,
          dialCode: currentCountry.dialCode,
          isValid: validation.isValid,
          error: validation.error,
        });
      }
    }
  };

  const inputId = id || (name ? `phone-${name}` : 'phone-input');
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`w-full flex flex-col gap-1.5 ${className}`} ref={containerRef}>
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

      {/* Main Composite Input Box */}
      <div
        className={`
          relative flex items-center rounded-xl transition-all duration-150 border
          bg-[#FFFDF9] dark:bg-[#111D1A]
          ${
            displayError
              ? 'border-[#C53030] ring-1 ring-[#C53030] bg-[#FDF0ED]/50'
              : 'border-[#E4DCD0] dark:border-[#233630] hover:border-[#173F36]/40 dark:hover:border-[#3B574E] focus-within:border-[#173F36] dark:focus-within:border-[#4EBA87] focus-within:ring-2 focus-within:ring-[#173F36]/15 dark:focus-within:ring-[#4EBA87]/20'
          }
          ${disabled ? 'opacity-60 bg-[#F4ECE0] dark:bg-[#0E1815] cursor-not-allowed' : ''}
        `}
      >
        {/* Country Selector Trigger Button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`
            flex items-center gap-1.5 px-3 py-2.5 h-full text-xs font-semibold
            text-[#17251F] dark:text-[#F7EFE4] shrink-0 border-r border-[#E4DCD0] dark:border-[#233630]
            hover:bg-[#E8EFEA]/50 dark:hover:bg-[#1A2B26]/50 rounded-l-xl transition-colors cursor-pointer
            focus:outline-none focus:bg-[#E8EFEA] dark:focus:bg-[#1A2B26]
            disabled:cursor-not-allowed disabled:hover:bg-transparent
          `}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Country selector: currently ${currentCountry.name} (${currentCountry.dialCode})`}
          title={`${currentCountry.name} (${currentCountry.dialCode})`}
        >
          <span className="text-base leading-none select-none" role="img" aria-hidden="true">
            {currentCountry.flag}
          </span>
          <span className="font-mono text-xs tabular-nums text-[#173F36] dark:text-[#9FB29E]">
            {currentCountry.dialCode}
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#657168] dark:text-[#9FB29E] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {/* National Number Input Field */}
        <input
          ref={phoneInputRef}
          id={inputId}
          name={name}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={nationalNumber}
          onChange={handleDigitsChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => setTouched(true)}
          disabled={disabled}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder || currentCountry.placeholder || 'e.g. 98765 43210'}
          aria-invalid={displayError ? 'true' : 'false'}
          aria-describedby={displayError ? errorId : helperText ? helperId : undefined}
          className={`
            flex-1 px-3 py-2.5 text-xs sm:text-sm font-mono tracking-wider tabular-nums
            text-[#17251F] dark:text-[#F7EFE4] placeholder-[#8D9890] dark:placeholder-[#657168]
            bg-transparent outline-none rounded-r-xl
            disabled:cursor-not-allowed
          `}
        />

        {/* Searchable Country Selector Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            onKeyDown={handleDropdownKeyDown}
            className="absolute left-0 top-full mt-1.5 w-72 sm:w-80 max-h-80 z-50 bg-[#FFFDF9] dark:bg-[#14221E] border border-[#E4DCD0] dark:border-[#233630] rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in duration-150"
          >
            {/* Search Input in Dropdown Header */}
            <div className="p-2 border-b border-[#E4DCD0] dark:border-[#233630] bg-[#F7EFE4]/60 dark:bg-[#101A18]/60 flex items-center gap-2">
              <Search className="w-4 h-4 text-[#657168] dark:text-[#9FB29E] shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setHighlightedIndex(0);
                }}
                placeholder="Search country or code..."
                className="w-full bg-transparent text-xs text-[#17251F] dark:text-[#F7EFE4] placeholder-[#8D9890] dark:placeholder-[#657168] outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 text-[#657168] dark:text-[#9FB29E] hover:text-[#17251F] dark:hover:text-[#F7EFE4]"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Country List Options */}
            <div ref={listRef} className="overflow-y-auto max-h-64 divide-y divide-[#E4DCD0]/30 dark:divide-[#233630]/30 py-1">
              {filteredCountries.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#657168] dark:text-[#9FB29E]">
                  No country found matching &ldquo;{searchQuery}&rdquo;
                </div>
              ) : (
                filteredCountries.map((c, index) => {
                  const isSelected = c.iso2 === selectedCountryCode;
                  const isHighlighted = index === highlightedIndex;
                  return (
                    <button
                      key={c.iso2}
                      type="button"
                      onClick={() => handleSelectCountry(c)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`
                        w-full flex items-center justify-between px-3 py-2 text-left text-xs transition-colors cursor-pointer
                        ${
                          isSelected
                            ? 'bg-[#173F36]/10 dark:bg-[#4EBA87]/15 font-semibold text-[#173F36] dark:text-[#4EBA87]'
                            : isHighlighted
                            ? 'bg-[#E8EFEA] dark:bg-[#1A2B26] text-[#17251F] dark:text-[#F7EFE4]'
                            : 'text-[#17251F] dark:text-[#F7EFE4] hover:bg-[#E8EFEA] dark:hover:bg-[#1A2B26]'
                        }
                      `}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <span className="text-base select-none shrink-0" role="img" aria-hidden="true">
                          {c.flag}
                        </span>
                        <span className="truncate">{c.name}</span>
                        <span className="text-[10px] uppercase font-mono text-[#657168] dark:text-[#9FB29E]">
                          ({c.iso2})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <span className="font-mono text-xs tabular-nums text-[#657168] dark:text-[#9FB29E]">
                          {c.dialCode}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#173F36] dark:text-[#4EBA87]" />}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Inline Validation Error or Helper Text */}
      {displayError ? (
        <p id={errorId} className="text-xs text-[#C53030] flex items-center gap-1 font-medium mt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{displayError}</span>
        </p>
      ) : helperText ? (
        <p id={helperId} className="text-[11px] text-[#657168] dark:text-[#9FB29E] mt-0.5">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}

export default PhoneInput;
