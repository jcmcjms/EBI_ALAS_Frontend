import { useEffect, type ReactNode } from 'react'
import { EditorContent, useEditor, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Placeholder } from '@tiptap/extensions'
import {
  ArrowClockwise,
  ArrowCounterClockwise,
  ListBullets,
  ListNumbers,
  TextB,
  TextItalic,
} from '@phosphor-icons/react'

import { Button } from '@/src/shared/ui/button'
import { Separator } from '@/src/shared/ui/separator'
import { Toggle } from '@/src/shared/ui/toggle'
import { cn } from '@/src/shared/lib/utils'
import {
  isRichTextEmpty,
  sanitizeRichText,
  toRichText,
} from '@/src/shared/lib/rich-text'

interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  onBlur?: () => void
  placeholder?: string
  invalid?: boolean
  disabled?: boolean
  ariaLabel?: string
  className?: string
}

export function RichTextEditor({
  value,
  onChange,
  onBlur,
  placeholder,
  invalid,
  disabled,
  ariaLabel,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        strike: false,
        link: false,
        horizontalRule: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: toRichText(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'rich-text min-h-24 px-3 py-2 text-sm outline-none',
        role: 'textbox',
        'aria-multiline': 'true',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ...(invalid ? { 'aria-invalid': 'true' } : {}),
      },
    },
    onUpdate: ({ editor: instance }) => {
      if (disabled) return
      const html = sanitizeRichText(instance.getHTML())
      onChange(isRichTextEmpty(html) ? '' : html)
    },
    onBlur: () => onBlur?.(),
  })

  const toolbar = useEditorState({
    editor,
    selector: ({ editor: instance }) => ({
      bold: instance?.isActive('bold') ?? false,
      italic: instance?.isActive('italic') ?? false,
      bulletList: instance?.isActive('bulletList') ?? false,
      orderedList: instance?.isActive('orderedList') ?? false,
      canUndo: instance?.can().undo() ?? false,
      canRedo: instance?.can().redo() ?? false,
    }),
    equalityFn: (a, b) => {
      if (!a || !b) return a === b
      return (
        a.bold === b.bold &&
        a.italic === b.italic &&
        a.bulletList === b.bulletList &&
        a.orderedList === b.orderedList &&
        a.canUndo === b.canUndo &&
        a.canRedo === b.canRedo
      )
    },
  })

  useEffect(() => {
    if (!editor || editor.view.hasFocus()) return
    const next = toRichText(value)
    const current = editor.getHTML()
    const unchanged =
      next === current || (isRichTextEmpty(next) && isRichTextEmpty(current))
    if (!unchanged) {
      editor.commands.setContent(next, { emitUpdate: false })
    }
  }, [value, editor])

  if (!editor) return null

  return (
    <div
      className={cn(
        'rounded-md border bg-transparent transition-colors focus-within:border-ring focus-within:ring-1 focus-within:ring-ring/50',
        invalid
          ? 'border-destructive focus-within:border-destructive focus-within:ring-destructive/50'
          : 'border-input',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Text formatting"
        className="flex flex-wrap items-center gap-0.5 border-b border-input/60 px-1.5 py-1"
      >
        <ToolbarToggle
          label="Bold"
          pressed={toolbar.bold}
          onPressedChange={() => editor.chain().focus().toggleBold().run()}
          disabled={disabled}
        >
          <TextB weight="bold" />
        </ToolbarToggle>
        <ToolbarToggle
          label="Italic"
          pressed={toolbar.italic}
          onPressedChange={() => editor.chain().focus().toggleItalic().run()}
          disabled={disabled}
        >
          <TextItalic weight="bold" />
        </ToolbarToggle>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <ToolbarToggle
          label="Bulleted list"
          pressed={toolbar.bulletList}
          onPressedChange={() =>
            editor.chain().focus().toggleBulletList().run()
          }
          disabled={disabled}
        >
          <ListBullets weight="bold" />
        </ToolbarToggle>
        <ToolbarToggle
          label="Numbered list"
          pressed={toolbar.orderedList}
          onPressedChange={() =>
            editor.chain().focus().toggleOrderedList().run()
          }
          disabled={disabled}
        >
          <ListNumbers weight="bold" />
        </ToolbarToggle>
        <Separator orientation="vertical" className="mx-1 h-4" />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!toolbar.canUndo || disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().undo().run()}
          aria-label="Undo"
          title="Undo"
        >
          <ArrowCounterClockwise weight="bold" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          disabled={!toolbar.canRedo || disabled}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => editor.chain().focus().redo().run()}
          aria-label="Redo"
          title="Redo"
        >
          <ArrowClockwise weight="bold" />
        </Button>
      </div>
      <div className="max-h-72 overflow-y-auto">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}

interface ToolbarToggleProps {
  label: string
  pressed: boolean
  onPressedChange: () => void
  disabled?: boolean
  children: ReactNode
}

function ToolbarToggle({
  label,
  pressed,
  onPressedChange,
  disabled,
  children,
}: ToolbarToggleProps) {
  return (
    <Toggle
      size="sm"
      pressed={pressed}
      onPressedChange={onPressedChange}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={label}
      title={label}
    >
      {children}
    </Toggle>
  )
}
