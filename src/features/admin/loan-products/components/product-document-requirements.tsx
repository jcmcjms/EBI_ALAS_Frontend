import { Plus, Trash } from '@phosphor-icons/react'
import { Button } from '@/src/shared/ui/primitives/button'
import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import type { DocumentRequirementItem } from '../api/loan-product-types'

interface ProductDocumentRequirementsEditorProps {
  value: DocumentRequirementItem[]
  onChange: (next: DocumentRequirementItem[]) => void
  disabled?: boolean
}

export function ProductDocumentRequirementsEditor({
  value,
  onChange,
  disabled = false,
}: ProductDocumentRequirementsEditorProps) {
  const updateAt = (index: number, patch: Partial<DocumentRequirementItem>) => {
    onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)))
  }

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          No document requirements configured for this product.
        </p>
      )}
      {value.map((row, index) => (
        <div
          key={index}
          className="grid grid-cols-[1fr_2fr_auto] items-end gap-2"
        >
          <div className="space-y-1.5">
            <Label className="text-xs">Code</Label>
            <Input
              value={row.code}
              disabled={disabled}
              maxLength={50}
              onChange={(e) => updateAt(index, { code: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Description</Label>
            <Input
              value={row.description}
              disabled={disabled}
              maxLength={200}
              onChange={(e) => updateAt(index, { description: e.target.value })}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={disabled}
            aria-label={`Remove ${row.code || `requirement ${index + 1}`}`}
            onClick={() => onChange(value.filter((_, i) => i !== index))}
          >
            <Trash size={14} />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || value.length >= 50}
        onClick={() => onChange([...value, { code: '', description: '' }])}
      >
        <Plus size={14} /> Add requirement
      </Button>
    </div>
  )
}
