'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { common, createLowlight } from 'lowlight'
import Highlight from '@tiptap/extension-highlight'
import Typography from '@tiptap/extension-typography'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface TipTapProps {
  content?: string
  editable?: boolean
  className?: string
  onUpdate?: (content: string) => void
}

const lowlight = createLowlight(common)

const processContent = (content: string) => {
  // Convert markdown to HTML
  const html = content
    .replace(/#{3}\s(.*)/g, '<h3>$1</h3>') // h3
    .replace(/#{2}\s(.*)/g, '<h2>$1</h2>') // h2
    .replace(/#{1}\s(.*)/g, '<h1>$1</h1>') // h1
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // bold
    .replace(/\*(.*?)\*/g, '<em>$1</em>') // italic
    .replace(/`([^`]+)`/g, '<code>$1</code>') // inline code
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>') // code block
    .replace(/- \[(x| )\] (.*)/g, (_, checked, text) => 
      `<li data-type="taskItem" data-checked="${checked === 'x'}">${text}</li>`) // task list
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>') // links
    .replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" />') // images

  return html
}

export default function Tiptap({ content = '', editable = true, className, onUpdate }: TipTapProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Placeholder.configure({
        placeholder: 'Write something...',
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      CodeBlockLowlight.configure({
        lowlight,
      }),
      Highlight,
      Typography,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'rounded-md max-w-full',
        },
      }),
    ],
    content: processContent(content),
    editable,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onUpdate?.(html)
    },
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose-base dark:prose-invert focus:outline-none max-w-full',
          'prose-headings:font-semibold prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
          'prose-p:my-2 prose-blockquote:border-l-2 prose-blockquote:pl-4 prose-blockquote:italic',
          'prose-code:bg-muted prose-code:p-1 prose-code:rounded',
          'prose-pre:bg-muted prose-pre:p-4 prose-pre:rounded-md',
          'prose-img:rounded-md prose-img:mx-auto',
          'prose-a:text-primary prose-a:no-underline hover:prose-a:underline',
          'prose-ul:list-disc prose-ol:list-decimal',
          'prose-li:my-1',
          className
        ),
      },
    },
  })

  // Add effect to update content when prop changes
  useEffect(() => {
    if (editor && content) {
      const processedContent = processContent(content)
      if (editor.getHTML() !== processedContent) {
        editor.commands.setContent(processedContent)
      }
    }
  }, [editor, content])

  return <EditorContent editor={editor} />
}
