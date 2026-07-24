import React from 'react';

interface SmartFillButtonProps {
  onClick: () => void;
  isGenerating: boolean;
  disabled?: boolean;
}

const SmartFillButton: React.FC<SmartFillButtonProps> = ({ onClick, isGenerating, disabled }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isGenerating}
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-ctatext shadow-cta transition-all
        ${isGenerating || disabled
          ? 'bg-cta/60 disabled:opacity-60 disabled:cursor-not-allowed'
          : 'bg-cta hover:-translate-y-0.5 hover:bg-ctah'
        }`}
    >
      {isGenerating ? (
        <>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
          Redactando…
        </>
      ) : (
        <>
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="m12 2 1.6 4.4L18 8l-4.4 1.6L12 14l-1.6-4.4L6 8l4.4-1.6z"/>
            <path d="M19 14l.8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8z"/>
          </svg>
          Smart Fill
        </>
      )}
    </button>
  );
};

export default SmartFillButton;
