import { useEffect, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import Document from '@tiptap/extension-document'
import Paragraph from '@tiptap/extension-paragraph'
import Text from '@tiptap/extension-text'
import BoldExtension from '@tiptap/extension-bold'
import ItalicExtension from '@tiptap/extension-italic'
import HeadingExtension from '@tiptap/extension-heading'
import BulletListExtension from '@tiptap/extension-bullet-list'
import OrderedListExtension from '@tiptap/extension-ordered-list'
import ListItem from '@tiptap/extension-list-item'
import BlockquoteExtension from '@tiptap/extension-blockquote'
import HorizontalRuleExtension from '@tiptap/extension-horizontal-rule'
import History from '@tiptap/extension-history'
import UnderlineExtension from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import TextAlignExtension from '@tiptap/extension-text-align'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from 'lucide-react'

interface PostingEditorProps {
  content: string
  onUpdate: (html: string) => void
}

function ToolbarBtn({
  children,
  label,
  active,
  onClick,
}: {
  children: React.ReactNode
  label: string
  active?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={`w-8 h-8 flex items-center justify-center rounded-md transition-colors text-sm
        ${active
          ? 'bg-[#FF8A3D] text-white'
          : 'text-[#5a5650] hover:bg-[#fff4ec] hover:text-[#FF8A3D]'
        }`}
    >
      {children}
    </button>
  )
}

export default function PostingEditor({ content, onUpdate }: PostingEditorProps) {
  const prevContentRef = useRef(content)

  const editor = useEditor({
    extensions: [
      Document,
      Paragraph,
      Text,
      BoldExtension,
      ItalicExtension,
      HeadingExtension.configure({ levels: [1, 2] }),
      BulletListExtension,
      OrderedListExtension,
      ListItem,
      BlockquoteExtension,
      HorizontalRuleExtension,
      History,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-[#FF8A3D] underline' },
      }),
      TextAlignExtension.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    onUpdate: ({ editor: ed }) => {
      const html = ed.getHTML()
      prevContentRef.current = html
      onUpdate(html)
    },
    editorProps: {
      attributes: {
        class:
          'min-h-[400px] w-full text-[#1a1714] text-base leading-8 px-2 py-2 focus:outline-none prose-editor',
      },
    },
  })

  useEffect(() => {
    if (editor && content !== prevContentRef.current) {
      prevContentRef.current = content
      editor.commands.setContent(content)
    }
  }, [content, editor])

  if (!editor) return null

  const addLink = () => {
    const url = window.prompt('링크 URL을 입력하세요:')
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
    }
  }

  return (
    <div className="relative">
      <div className="sticky top-0 z-10 bg-white border border-[#e0dbd3] rounded-xl shadow-sm mb-4 px-3 py-2">
        <div className="flex flex-wrap items-center gap-0.5">
          <ToolbarBtn
            label="굵게"
            active={editor.isActive('bold')}
            onClick={() => editor.chain().focus().toggleBold().run()}
          >
            <Bold className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="기울임"
            active={editor.isActive('italic')}
            onClick={() => editor.chain().focus().toggleItalic().run()}
          >
            <Italic className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="밑줄"
            active={editor.isActive('underline')}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
          >
            <UnderlineIcon className="w-4 h-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-[#e0dbd3] mx-1" />

          <ToolbarBtn
            label="제목1"
            active={editor.isActive('heading', { level: 1 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          >
            <Heading1 className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="제목2"
            active={editor.isActive('heading', { level: 2 })}
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          >
            <Heading2 className="w-4 h-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-[#e0dbd3] mx-1" />

          <ToolbarBtn
            label="글머리 기호"
            active={editor.isActive('bulletList')}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
          >
            <List className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="번호 매기기"
            active={editor.isActive('orderedList')}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
          >
            <ListOrdered className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="인용구"
            active={editor.isActive('blockquote')}
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <Quote className="w-4 h-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-[#e0dbd3] mx-1" />

          <ToolbarBtn
            label="왼쪽 정렬"
            active={editor.isActive({ textAlign: 'left' })}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
          >
            <AlignLeft className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="가운데 정렬"
            active={editor.isActive({ textAlign: 'center' })}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
          >
            <AlignCenter className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn
            label="오른쪽 정렬"
            active={editor.isActive({ textAlign: 'right' })}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
          >
            <AlignRight className="w-4 h-4" />
          </ToolbarBtn>

          <div className="w-px h-5 bg-[#e0dbd3] mx-1" />

          <ToolbarBtn label="링크" active={editor.isActive('link')} onClick={addLink}>
            <LinkIcon className="w-4 h-4" />
          </ToolbarBtn>
          <ToolbarBtn label="구분선" onClick={() => editor.chain().focus().setHorizontalRule().run()}>
            <Minus className="w-4 h-4" />
          </ToolbarBtn>
        </div>
      </div>
      <EditorContent editor={editor} />

      <style>{`
        .prose-editor h1 {
          font-size: 1.75rem;
          font-weight: 700;
          margin: 1.25rem 0 0.5rem;
          color: #1a1714;
          line-height: 1.3;
        }
        .prose-editor h2 {
          font-size: 1.35rem;
          font-weight: 600;
          margin: 1rem 0 0.4rem;
          color: #1a1714;
          line-height: 1.35;
        }
        .prose-editor ul {
          list-style: disc;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .prose-editor ol {
          list-style: decimal;
          padding-left: 1.5rem;
          margin: 0.5rem 0;
        }
        .prose-editor li {
          margin: 0.25rem 0;
          line-height: 1.7;
        }
        .prose-editor blockquote {
          border-left: 4px solid #FF8A3D;
          padding-left: 1.25rem;
          color: #5a5650;
          font-style: italic;
          margin: 1rem 0;
        }
        .prose-editor hr {
          border: none;
          border-top: 1.5px solid #e0dbd3;
          margin: 1.5rem 0;
        }
        .prose-editor a {
          color: #FF8A3D;
          text-decoration: underline;
          cursor: pointer;
        }
        .prose-editor a:hover {
          color: #e87730;
        }
        .prose-editor p {
          margin: 0.5rem 0;
          line-height: 1.8;
        }
      `}</style>
    </div>
  )
}
