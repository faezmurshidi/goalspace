'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/github-dark.css';
import '@/styles/editor.css';
import { Bold, Italic, List, ListChecks, Heading2, Code, Quote, Sparkles } from 'lucide-react';
import { Space } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

const lowlight = createLowlight(common);

interface SpaceContentEditorProps {
  space: Space;
  onUpdate?: (content: string) => void;
  editable?: boolean;
  onAIAssist?: (content: string) => Promise<string>;
}

const MenuButton = ({ 
  onClick, 
  isActive = false, 
  disabled = false,
  children 
}: { 
  onClick: () => void; 
  isActive?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "h-8 px-3",
      isActive && "bg-muted"
    )}
  >
    {children}
  </Button>
);

export function SpaceContentEditor({ space, onUpdate, editable = true, onAIAssist }: SpaceContentEditorProps) {
  // Convert space data into markdown content
  const generateInitialContent = () => {
    const content = [
      '## 🎯 Learning Objectives\n',
      ...space.objectives.map(obj => `- ${obj}\n`),
      '\n## 📋 Prerequisites\n',
      ...space.prerequisites.map(pre => `- ${pre}\n`),
      '\n## ✅ To-Do List\n',
      ...space.to_do_list.map(todo => `- [ ] ${todo}\n`)
    ].join('');
    
    return content;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:text-blue-600 underline',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'block bg-gray-100 dark:bg-gray-800 rounded p-4 text-sm font-mono overflow-x-auto',
        },
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-2 my-2',
        },
      }),
    ],
    content: generateInitialContent(),
    editable,
    editorProps: {
      attributes: {
        class: 'prose dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML());
    },
  });

  const handleAIAssist = async () => {
    if (!editor || !onAIAssist) return;
    
    const currentContent = editor.getHTML();
    try {
      const enhancedContent = await onAIAssist(currentContent);
      editor.commands.setContent(enhancedContent);
    } catch (error) {
      console.error('Error using AI assist:', error);
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-content-editor border rounded-lg">
      {editable && (
        <div className="flex flex-wrap items-center gap-1 p-1 border-b">
          <MenuButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            isActive={editor.isActive('heading', { level: 2 })}
          >
            <Heading2 className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            isActive={editor.isActive('bold')}
          >
            <Bold className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            isActive={editor.isActive('italic')}
          >
            <Italic className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            isActive={editor.isActive('codeBlock')}
          >
            <Code className="h-4 w-4" />
          </MenuButton>
          <div className="w-px h-4 bg-border mx-1" />
          <MenuButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            isActive={editor.isActive('bulletList')}
          >
            <List className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            isActive={editor.isActive('taskList')}
          >
            <ListChecks className="h-4 w-4" />
          </MenuButton>
          <MenuButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            isActive={editor.isActive('blockquote')}
          >
            <Quote className="h-4 w-4" />
          </MenuButton>
          <div className="w-px h-4 bg-border mx-1" />
          <MenuButton
            onClick={handleAIAssist}
            disabled={!onAIAssist}
          >
            <Sparkles className="h-4 w-4" />
          </MenuButton>
        </div>
      )}
      <EditorContent editor={editor} />
    </div>
  );
}
