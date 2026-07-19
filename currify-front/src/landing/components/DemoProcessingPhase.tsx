import React, { useEffect, useRef, useState } from 'react';
import { Check } from '@phosphor-icons/react';

interface DemoProcessingPhaseProps {
  onComplete: () => void;
}

const MESSAGES = [
  { text: 'Conectando con el parser de Evalen...', key: 'connect' },
  { text: 'Extrayendo información personal...', key: 'personal' },
  { text: 'Extrayendo experiencia laboral...', key: 'experience' },
  { text: 'Extrayendo formación y habilidades...', key: 'skills' },
  { text: 'Comparando contra campaña...', key: 'campaign' },
  { text: 'Generando evaluación de compatibilidad...', key: 'scoring' },
];

const INTERVAL_MS = 3000;

const DemoProcessingPhase: React.FC<DemoProcessingPhaseProps> = ({ onComplete }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    if (activeIndex >= MESSAGES.length) {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
      return;
    }
    const timer = setTimeout(() => setActiveIndex((i) => i + 1), INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [activeIndex, onComplete]);

  return (
    <div
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0f172a]/80 backdrop-blur-sm"
      role="status"
      aria-busy={activeIndex < MESSAGES.length}
      aria-label="Procesando evaluación de candidato"
    >
      {/* Scanline */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none motion-reduce:hidden">
        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#4f46e5]/60 to-transparent animate-scanline"
        />
      </div>

      {/* Messages */}
      <div className="relative z-10 space-y-4 text-center max-w-md" aria-live="polite">
        {MESSAGES.map((msg, i) => {
          const isActive = i === activeIndex;
          const isDone = i < activeIndex;
          return (
            <div
              key={msg.key}
              className={`flex items-center gap-3 transition-all duration-500 ${
                isActive
                  ? 'opacity-100 translate-y-0'
                  : isDone
                  ? 'opacity-40 translate-y-0'
                  : 'opacity-0 translate-y-4 invisible max-h-0 overflow-hidden'
              }`}
            >
              <span className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">
                {isDone ? (
                  <Check className="w-5 h-5 text-[#22c55e]" weight="bold" />
                ) : (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full motion-safe:animate-spin" />
                )}
              </span>
              <span
                className={`text-lg font-medium ${
                  isActive ? 'text-white' : isDone ? 'text-white/60' : 'text-white/20'
                }`}
              >
                {msg.text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DemoProcessingPhase;
