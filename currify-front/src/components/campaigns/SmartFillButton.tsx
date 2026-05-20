import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';

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
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-all shadow-md
        ${isGenerating || disabled 
          ? 'bg-purple-400 cursor-not-allowed opacity-70' 
          : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg'
        }`}
    >
      {isGenerating ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Generando con IA...
        </>
      ) : (
        <>
          <SparklesIcon className="w-5 h-5 text-yellow-300" />
          Smart Fill
        </>
      )}
    </button>
  );
};

export default SmartFillButton;
