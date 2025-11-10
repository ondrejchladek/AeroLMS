'use client';

import React, { useEffect } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  ImageIcon,
  Table as TableIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Highlighter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  value?: string; // JSON string or HTML
  onChange?: (value: string) => void; // Returns JSON string
  placeholder?: string;
  editable?: boolean;
  className?: string;
}

const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null;
  }

  const buttonClass = (isActive: boolean) =>
    cn('h-8 w-8 p-0', isActive && 'bg-accent text-accent-foreground');

  return (
    <div className='bg-muted/30 flex flex-wrap gap-1 border-b p-2'>
      {/* Text formatting */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('bold'))}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title='Bold (Ctrl+B)'
        >
          <Bold className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('italic'))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title='Italic (Ctrl+I)'
        >
          <Italic className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('underline'))}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title='Underline (Ctrl+U)'
        >
          <UnderlineIcon className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('strike'))}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title='Strikethrough'
        >
          <Strikethrough className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('code'))}
          onClick={() => editor.chain().focus().toggleCode().run()}
          title='Inline code'
        >
          <Code className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Headings */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('heading', { level: 1 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 1 }).run()
          }
          title='Heading 1'
        >
          <Heading1 className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('heading', { level: 2 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          title='Heading 2'
        >
          <Heading2 className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('heading', { level: 3 }))}
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          title='Heading 3'
        >
          <Heading3 className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Lists */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('bulletList'))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title='Bullet list'
        >
          <List className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('orderedList'))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title='Numbered list'
        >
          <ListOrdered className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('blockquote'))}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title='Blockquote'
        >
          <Quote className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Alignment */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive({ textAlign: 'left' }))}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title='Align left'
        >
          <AlignLeft className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive({ textAlign: 'center' }))}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title='Align center'
        >
          <AlignCenter className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive({ textAlign: 'right' }))}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title='Align right'
        >
          <AlignRight className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive({ textAlign: 'justify' }))}
          onClick={() => editor.chain().focus().setTextAlign('justify').run()}
          title='Justify'
        >
          <AlignJustify className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Insert elements */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('link'))}
          onClick={() => {
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.chain().focus().setLink({ href: url }).run();
            }
          }}
          title='Insert link'
        >
          <LinkIcon className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => {
            const url = window.prompt('Enter image URL:');
            if (url) {
              editor.chain().focus().setImage({ src: url }).run();
            }
          }}
          title='Insert image'
        >
          <ImageIcon className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()
          }
          title='Insert table'
        >
          <TableIcon className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Highlight */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          className={buttonClass(editor.isActive('highlight'))}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title='Highlight text'
        >
          <Highlighter className='h-4 w-4' />
        </Button>
      </div>

      <Separator orientation='vertical' className='h-8' />

      {/* Undo/Redo */}
      <div className='flex gap-1'>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title='Undo (Ctrl+Z)'
        >
          <Undo className='h-4 w-4' />
        </Button>
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title='Redo (Ctrl+Shift+Z)'
        >
          <Redo className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
};

export function TiptapEditor({
  value = '',
  onChange,
  placeholder = 'Začněte psát obsah školení...',
  editable = true,
  className
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration mismatch in Next.js 15
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-4'
        }
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-md'
        }
      }),
      Table.configure({
        resizable: true,
        HTMLAttributes: {
          class: 'border-collapse table-auto w-full'
        }
      }),
      TableRow,
      TableCell,
      TableHeader,
      TextAlign.configure({
        types: ['heading', 'paragraph']
      }),
      Highlight.configure({
        multicolor: false
      }),
      Color,
      TextStyle,
      Placeholder.configure({
        placeholder
      })
    ],
    content: value ? (isJSON(value) ? JSON.parse(value) : value) : '',
    editable,
    onUpdate: ({ editor }) => {
      // Return JSON string for storage
      const json = editor.getJSON();
      onChange?.(JSON.stringify(json));
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg xl:prose-xl',
          'max-w-none',
          'focus:outline-none',
          'min-h-[400px] p-4'
        )
      }
    }
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== undefined) {
      const currentContent = JSON.stringify(editor.getJSON());
      const newContent = isJSON(value)
        ? value
        : JSON.stringify({ type: 'doc', content: [] });

      if (currentContent !== newContent) {
        editor.commands.setContent(isJSON(value) ? JSON.parse(value) : '');
      }
    }
  }, [editor, value]);

  return (
    <div
      className={cn(
        'bg-background overflow-hidden rounded-md border',
        className
      )}
    >
      {editable && <MenuBar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}

// Helper function to check if string is valid JSON
function isJSON(str: string): boolean {
  if (!str || str.trim() === '') return false;
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}
