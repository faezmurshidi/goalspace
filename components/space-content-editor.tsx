'use client';

import { useState, useEffect, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { Extension } from '@tiptap/core';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/github-dark.css';
import '@/styles/editor.css';
import { Bold, Italic, List, ListChecks, Heading2, Code, Quote, Sparkles, Loader2, FileDown, FileUp } from 'lucide-react';
import { Space } from '@/lib/store';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { useSpaceStore } from '@/lib/store';


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
  const [isGenerating, setIsGenerating] = useState(false);
  const { content: storedContent, setContent, addDocument } = useSpaceStore();
  const initialContent = storedContent[space.id] || space.content || '';

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
          HTMLAttributes: {
            1: { class: 'text-4xl font-bold mt-12 mb-6' },
            2: { class: 'text-3xl font-bold mt-8 mb-4' },
            3: { class: 'text-2xl font-bold mt-6 mb-3' },
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'text-lg leading-relaxed mb-6',
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-disc pl-8 mb-6 space-y-3',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
          HTMLAttributes: {
            class: 'list-decimal pl-8 mb-6 space-y-3',
          },
        },
        listItem: {
          HTMLAttributes: {
            class: 'text-lg leading-relaxed',
          },
        },
        code: {
          HTMLAttributes: {
            class: 'rounded bg-gray-100 dark:bg-gray-800/50 px-1.5 py-0.5 text-sm font-mono',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'border-l-4 border-gray-200 dark:border-gray-700 pl-6 py-1 my-6 text-gray-600 dark:text-gray-400',
          },
        },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline decoration-blue-400/30 hover:decoration-blue-400 transition-colors',
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        HTMLAttributes: {
          class: 'block bg-gray-100 dark:bg-gray-800/50 rounded-xl p-6 mb-6 text-sm font-mono overflow-x-auto border border-gray-200 dark:border-gray-700',
        },
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'not-prose pl-2 space-y-3',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'flex items-start gap-3 my-2',
        },
      }),
    ],
    content: initialContent,
    editable,
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[300px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      onUpdate?.(content);
      setContent(space.id, content);
    },
  });

  // Generate initial content when the component mounts
  useEffect(() => {
    const generateContent = async () => {
      // Skip if no space, or if content already exists
      if (!space || space.content || storedContent[space.id]) return;
      
      setIsGenerating(true);
      try {
        const response = await fetch('/api/generate-initial-content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ spaceDetails: space }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to generate content');
        }

        const data = await response.json();
        setContent(space.id, data.content);

        // Save the generated content to the knowledge base
        addDocument(space.id, {
          title: `Initial Content: ${space.title}`,
          content: data.content,
          type: 'guide',
          tags: ['initial-content', space.category],
        });
      } catch (error) {
        console.error('Error generating initial content:', error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateContent();
  }, [space, storedContent, setContent, addDocument]);

  // Update editor content when stored content changes
  useEffect(() => {
    if (editor && storedContent[space.id]) {
      editor.commands.setContent(storedContent[space.id]);
    }
  }, [editor, space.id, storedContent]);

  const handleAIAssist = async () => {
    if (!editor || !onAIAssist) return;
    
    setIsGenerating(true);
    const currentContent = editor.getHTML();
    try {
      const enhancedContent = await onAIAssist(currentContent);
      editor.commands.setContent(enhancedContent);
    } catch (error) {
      console.error('Error using AI assist:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExportMarkdown = () => {
    if (!editor) return;
    const content = editor.getHTML();
    // Convert HTML to Markdown
    const markdown = content
      .replace(/<h1>(.*?)<\/h1>/g, '# $1\n\n')
      .replace(/<h2>(.*?)<\/h2>/g, '## $1\n\n')
      .replace(/<h3>(.*?)<\/h3>/g, '### $1\n\n')
      .replace(/<p>(.*?)<\/p>/g, '$1\n\n')
      .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
      .replace(/<em>(.*?)<\/em>/g, '*$1*')
      .replace(/<code>(.*?)<\/code>/g, '`$1`')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/g, '```\n$1\n```\n\n')
      .replace(/<blockquote>([\s\S]*?)<\/blockquote>/g, '> $1\n\n')
      .replace(/<ul>([\s\S]*?)<\/ul>/g, '$1\n')
      .replace(/<ol>([\s\S]*?)<\/ol>/g, '$1\n')
      .replace(/<li>(.*?)<\/li>/g, '- $1\n')
      .replace(/<a href="(.*?)">(.*?)<\/a>/g, '[$2]($1)')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n\n+/g, '\n\n')
      .trim();

    // Create and download markdown file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${space.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportMarkdown = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const markdown = e.target?.result as string;
      // Convert Markdown to HTML
      const html = markdown
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/^\> (.*$)/gm, '<blockquote>$1</blockquote>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(.+)$/gm, '<p>$1</p>');

      editor.commands.setContent(html);
    };
    reader.readAsText(file);
  };

  if (!editor) {
    return null;
  }

  return (
    <div className="space-content-editor border rounded-lg bg-white dark:bg-gray-900 shadow-sm h-[calc(100vh-8rem)] flex flex-col">
      {editable && (
        <div className="flex-none flex flex-wrap items-center gap-1 p-2 border-b bg-gray-50 dark:bg-gray-800/50 rounded-t-lg">
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
          <div className="w-px h-4 bg-border mx-2" />
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
          <div className="w-px h-4 bg-border mx-2" />
          <MenuButton
            onClick={handleAIAssist}
            disabled={!onAIAssist || isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </MenuButton>
          <div className="w-px h-4 bg-border mx-2" />
          <MenuButton onClick={handleExportMarkdown}>
            <FileDown className="h-4 w-4" />
          </MenuButton>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".md"
              className="hidden"
              onChange={handleImportMarkdown}
            />
            <MenuButton onClick={() => {}}>
              <FileUp className="h-4 w-4" />
            </MenuButton>
          </label>
        </div>
      )}
      <div className="relative flex-1 overflow-auto">
        <EditorContent editor={editor} className="h-full" />
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 shadow-lg">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-gray-600 dark:text-gray-300">Generating content...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
