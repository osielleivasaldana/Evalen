import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import {
  BoldIcon,
  ItalicIcon,
  ListBulletIcon,
  NumberedListIcon,
  LinkIcon,
  PhotoIcon,
  TableCellsIcon,
  ArrowUturnLeftIcon,
  ArrowUturnRightIcon,
  ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  error?: boolean;
  onMaximize?: () => void;
  showMaximize?: boolean;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe aquí...',
  error = false,
  onMaximize,
  showMaximize = true
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        inline: true,
        allowBase64: true
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-indigo-600 underline'
        }
      }),
      Table.configure({
        resizable: true
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      })
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-4 text-gray-900 bg-white'
      }
    }
  });

  // Sync external value changes to editor
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  const addImage = () => {
    const url = window.prompt('URL de la imagen:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addLink = () => {
    const url = window.prompt('URL del enlace:');
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  const addTable = () => {
    if (editor) {
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className={`border-2 rounded-lg overflow-hidden flex flex-col bg-white text-gray-900 ${!showMaximize ? 'h-full' : ''} ${error ? 'border-red-500' : 'border-gray-300'} focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500`}>
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-1 items-center justify-between">
        <div className="flex flex-wrap gap-1 flex-1">
        {/* Text Formatting */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bold') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Negrita"
          type="button"
        >
          <BoldIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('italic') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Cursiva"
          type="button"
        >
          <ItalicIcon className="w-5 h-5" />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Headings */}
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors font-bold ${
            editor.isActive('heading', { level: 2 }) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Título 2"
          type="button"
        >
          H2
        </button>

        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors font-bold ${
            editor.isActive('heading', { level: 3 }) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Título 3"
          type="button"
        >
          H3
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Lists */}
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('bulletList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Lista con viñetas"
          type="button"
        >
          <ListBulletIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('orderedList') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Lista numerada"
          type="button"
        >
          <NumberedListIcon className="w-5 h-5" />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Alignment */}
        <button
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm ${
            editor.isActive({ textAlign: 'left' }) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Alinear izquierda"
          type="button"
        >
          ⬅
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm ${
            editor.isActive({ textAlign: 'center' }) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Centrar"
          type="button"
        >
          ↔
        </button>

        <button
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          className={`px-3 py-2 rounded hover:bg-gray-200 transition-colors text-sm ${
            editor.isActive({ textAlign: 'right' }) ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Alinear derecha"
          type="button"
        >
          ➡
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Insert Elements */}
        <button
          onClick={addLink}
          className={`p-2 rounded hover:bg-gray-200 transition-colors ${
            editor.isActive('link') ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
          }`}
          title="Insertar enlace"
          type="button"
        >
          <LinkIcon className="w-5 h-5" />
        </button>

        <button
          onClick={addImage}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700"
          title="Insertar imagen"
          type="button"
        >
          <PhotoIcon className="w-5 h-5" />
        </button>

        <button
          onClick={addTable}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700"
          title="Insertar tabla"
          type="button"
        >
          <TableCellsIcon className="w-5 h-5" />
        </button>

        <div className="w-px bg-gray-300 mx-1" />

        {/* Undo/Redo */}
        <button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Deshacer"
          type="button"
        >
          <ArrowUturnLeftIcon className="w-5 h-5" />
        </button>

        <button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          className="p-2 rounded hover:bg-gray-200 transition-colors text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
          title="Rehacer"
          type="button"
        >
          <ArrowUturnRightIcon className="w-5 h-5" />
        </button>
        </div>

        {/* Maximize Button */}
        {showMaximize && onMaximize && (
          <button
            onClick={onMaximize}
            className="p-2 rounded hover:bg-indigo-100 transition-colors text-indigo-600 hover:text-indigo-700 ml-2"
            title="Maximizar editor"
            type="button"
          >
            <ArrowsPointingOutIcon className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Editor Content */}
      <div className={`${!showMaximize ? 'flex-1 overflow-auto' : ''}`}>
        <EditorContent editor={editor} className={!showMaximize ? 'h-full' : ''} />
      </div>
    </div>
  );
};

export default RichTextEditor;
