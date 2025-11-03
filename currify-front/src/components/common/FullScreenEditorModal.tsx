import React, { useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import RichTextEditor from './RichTextEditor';

interface FullScreenEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (html: string) => void;
  title: string;
  placeholder?: string;
}

const FullScreenEditorModal: React.FC<FullScreenEditorModalProps> = ({
  isOpen,
  onClose,
  value,
  onChange,
  title,
  placeholder
}) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full h-full max-w-7xl max-h-screen m-4 bg-white rounded-2xl shadow-2xl flex flex-col animate-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-gray-200 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-t-2xl">
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors duration-200 font-semibold flex items-center gap-2"
            >
              <CheckIcon className="w-5 h-5" />
              Guardar y Cerrar
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors duration-200"
              title="Cerrar (Esc)"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Editor Content */}
        <div className="flex-1 overflow-hidden p-6 flex flex-col">
          <div className="flex-1 flex flex-col max-w-6xl mx-auto w-full">
            <div className="flex-1 flex flex-col min-h-0">
              <RichTextEditor
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                error={false}
                showMaximize={false}
              />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <p className="text-sm text-gray-600 text-center">
            Presiona <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">Esc</kbd> o haz clic en "Guardar y Cerrar" para salir
          </p>
        </div>
      </div>

      <style>{`
        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-modal-in {
          animation: modal-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
};

export default FullScreenEditorModal;
