import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

/**
 * Enterprise Sandstone Modal Component
 * Features:
 * - Full ARIA dialog semantics (role="dialog", aria-modal="true")
 * - Keyboard Escape key dismissal
 * - Focus trapping inside the dialog
 * - Warm backdrop with subtle blur
 * - Standardized Sandstone header, body, and footer with seamless dark mode
 */
export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
  footer,
  className = '',
}) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === modalRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    // Save previous active element to restore focus on close
    const previousActiveElement = document.activeElement;
    document.addEventListener('keydown', handleKeyDown);

    // Prevent background scrolling
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus only once upon initially opening, if focus is not already inside modal
    const rafId = requestAnimationFrame(() => {
      if (modalRef.current && !modalRef.current.contains(document.activeElement)) {
        const firstFocusable = modalRef.current.querySelector(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        } else {
          modalRef.current.focus();
        }
      }
    });

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      if (
        previousActiveElement &&
        typeof previousActiveElement.focus === 'function' &&
        document.body.contains(previousActiveElement)
      ) {
        previousActiveElement.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/65 backdrop-blur-xs animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCloseRef.current?.();
        }
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        className={`w-full ${maxWidth} bg-white dark:bg-[#1C1815] border border-[#E5D8C6] dark:border-[#382F26] text-[#1F2937] dark:text-[#F7F3EC] rounded-2xl shadow-sandstone-lg flex flex-col max-h-[90vh] animate-scale-in outline-none transition-colors duration-200 ${className}`}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#E5D8C6]/80 dark:border-[#382F26]/80 shrink-0">
          <div>
            {title && (
              <h2 id="modal-title" className="text-base sm:text-lg font-bold text-[#1F2937] dark:text-[#F7F3EC] tracking-tight">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-[#5B6470] dark:text-[#A89B8C] mt-0.5 font-medium leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => onCloseRef.current?.()}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-[#5B6470] dark:text-[#A89B8C] hover:text-[#1F2937] dark:hover:text-[#F7F3EC] hover:bg-[#F1E8DB] dark:hover:bg-[#25201A] transition-colors cursor-pointer shrink-0 ml-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#92400E] dark:focus-visible:ring-[#D97706]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-5 overflow-y-auto flex-1 min-w-0">
          {children}
        </div>

        {/* Optional Modal Footer */}
        {footer && (
          <div className="p-4 bg-[#FAF7F2]/60 dark:bg-[#181512]/60 border-t border-[#E5D8C6]/80 dark:border-[#382F26]/80 rounded-b-2xl shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

export default Modal;
