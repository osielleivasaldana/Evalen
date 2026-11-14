import React, { useCallback, useEffect, useRef } from 'react';

interface SimpleEditorProps {
  field?: string;
  value: string;
  onChange: (html: string) => void;
  placeholder: string;
  error?: boolean;
}

const path = (d: string) => <path d={d} />;

const svg = (children: React.ReactNode) => (
  <svg className="h-[17px] w-[17px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const UnorderedListIcon = () => svg(<>{path('M8 6h13M8 12h13M8 18h13')}{path('M3.5 6h.01')}{path('M3.5 12h.01')}{path('M3.5 18h.01')}</>);

const OrderedListIcon = () => svg(<>{path('M10 6h11M10 12h11M10 18h11M3 5h1.5v4M3 9h3')}{path('M3 14h3l-3 4h3')}</>);

const OutdentIcon = () => svg(<>{path('M9 6h12M9 12h12M9 18h12')}{path('M3 9l3 3-3 3')}</>);

const QuoteIcon = () => svg(<>{path('M7 7H4v4h3l-1 4M16 7h-3v4h3l-1 4')}</>);

const IndentIcon = () => svg(<>{path('M9 6h12M9 12h12M9 18h12')}{path('M3 9l3-3M3 9l3 3')}</>);

const LinkIcon = () => svg(<>{path('M10 13a4 4 0 0 0 6 .5l2-2a4 4 0 0 0-6-6l-1 1M14 11a4 4 0 0 0-6-.5l-2 2a4 4 0 0 0 6 6l1-1')}</>);

const UndoIcon = () => svg(<>{path('M9 14 4 9l5-5')}{path('M4 9h11a5 5 0 0 1 0 10h-3')}</>);

const RedoIcon = () => svg(<>{path('M15 14l5-5-5-5')}{path('M20 9H9a5 5 0 0 0 0 10h3')}</>);

const FullscreenIcon = () => svg(<>{path('M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3')}</>);

interface ToolbarButton {
  label: string;
  cmd: string;
  icon?: React.ReactNode;
  right?: boolean;
  className?: string;
}

const SimpleEditor: React.FC<SimpleEditorProps> = ({
  value,
  onChange,
  placeholder,
  error = false
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const isInternalChange = useRef(false);

  useEffect(() => {
    const ed = editorRef.current;
    if (ed && value !== ed.innerHTML && !isInternalChange.current) {
      ed.innerHTML = value;
    }
    isInternalChange.current = false;
  }, [value]);

  const exec = useCallback((cmd: string) => {
    const ed = editorRef.current;
    if (!ed) return;
    ed.focus();

    switch (cmd) {
      case 'h2':
        document.execCommand('formatBlock', false, 'H2');
        break;
      case 'h3':
        document.execCommand('formatBlock', false, 'H3');
        break;
      case 'quote':
        document.execCommand('formatBlock', false, 'BLOCKQUOTE');
        break;
      case 'createLink': {
        const url = window.prompt('URL:');
        if (url) document.execCommand('createLink', false, url);
        break;
      }
      case 'fullscreen':
        ed.classList.toggle('is-full');
        break;
      default:
        document.execCommand(cmd, false, undefined);
    }

    isInternalChange.current = true;
    onChange(ed.innerHTML);
  }, [onChange]);

  const handleInput = useCallback(() => {
    const ed = editorRef.current;
    if (!ed) return;
    isInternalChange.current = true;
    onChange(ed.innerHTML);
  }, [onChange]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
    const ed = editorRef.current;
    if (ed) onChange(ed.innerHTML);
  }, [onChange]);

  const buttons: ToolbarButton[] = [
    { label: 'B', cmd: 'bold', className: 'font-bold' },
    { label: 'I', cmd: 'italic', className: 'italic font-serif' },
    { label: '-', cmd: 'sep' },
    { label: 'H2', cmd: 'h2', className: 'font-bold' },
    { label: 'H3', cmd: 'h3', className: 'font-bold text-[12px]' },
    { label: '-', cmd: 'sep' },
    { label: '', cmd: 'insertUnorderedList', icon: <UnorderedListIcon /> },
    { label: '', cmd: 'insertOrderedList', icon: <OrderedListIcon /> },
    { label: '-', cmd: 'sep' },
    { label: '', cmd: 'outdent', icon: <OutdentIcon /> },
    { label: '', cmd: 'quote', icon: <QuoteIcon /> },
    { label: '', cmd: 'indent', icon: <IndentIcon /> },
    { label: '-', cmd: 'sep' },
    { label: '', cmd: 'createLink', icon: <LinkIcon /> },
    { label: '', cmd: 'undo', icon: <UndoIcon /> },
    { label: '', cmd: 'redo', icon: <RedoIcon /> },
    { label: '-', cmd: 'sep' },
    { label: '', cmd: 'fullscreen', icon: <FullscreenIcon />, right: true },
  ];

  return (
    <div className={`rte-wrap overflow-hidden rounded-xl border bg-card transition focus-within:border-green focus-within:ring-2 focus-within:ring-green/25 t-card ${error ? 'border-low' : 't-line2'}`}>
      <div className="flex flex-wrap items-center gap-0.5 border-b border-line bg-paper2/60 px-1.5 py-1.5 t-line t-paper2">
        {buttons.map((btn, i) => {
          if (btn.cmd === 'sep') {
            return <div key={i} className="mx-1 h-5 w-px bg-line2 t-line2" />;
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => exec(btn.cmd)}
              className={`tb-btn grid h-8 min-w-8 place-items-center rounded-md px-1.5 text-[13px] text-ink2 transition hover:bg-greentint hover:text-green t-ink2 ${btn.right ? 'ml-auto' : ''} ${btn.className || ''}`}
            >
              {btn.icon || btn.label}
            </button>
          );
        })}
      </div>
      <div
        ref={editorRef}
        className="rte px-4 py-3 text-[14.5px] leading-relaxed text-ink t-ink outline-none"
        contentEditable
        data-placeholder={placeholder}
        onInput={handleInput}
        onPaste={handlePaste}
        suppressContentEditableWarning
      />
    </div>
  );
};

export default SimpleEditor;
