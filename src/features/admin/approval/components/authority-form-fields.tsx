import { Input } from '@/src/shared/ui/primitives/input'
import { Label } from '@/src/shared/ui/primitives/label'
import { Switch } from '@/src/shared/ui/primitives/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/forms/select'
import type { AuthorityFormState } from './authority-form-schema'

const SEVERITY_OPTIONS = [
  { value: '0', label: 'None' },
  { value: '1', label: 'Minor' },
  { value: '2', label: 'Major' },
]

const SCOPE_OPTIONS = [
  { value: '0', label: 'Branch' },
  { value: '1', label: 'Area' },
  { value: '2', label: 'Global' },
]

interface AuthorityFormFieldsProps {
  state: AuthorityFormState
  onChange: (patch: Partial<AuthorityFormState>) => void
  errors: Partial<Record<keyof AuthorityFormState, string>>
  idPrefix: string
}

export function AuthorityFormFields({
  state,
  onChange,
  errors,
  idPrefix,
}: AuthorityFormFieldsProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-displayName`}>Display name</Label>
        <Input
          id={`${idPrefix}-displayName`}
          value={state.displayName}
          onChange={(e) => onChange({ displayName: e.target.value })}
          maxLength={100}
          placeholder="e.g. Area Head"
        />
        {errors.displayName && (
          <p className="text-xs text-destructive">{errors.displayName}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-tier`}>Tier</Label>
          <Input
            id={`${idPrefix}-tier`}
            type="number"
            min={1}
            value={state.tier}
            onChange={(e) => onChange({ tier: e.target.value })}
          />
          {errors.tier && (
            <p className="text-xs text-destructive">{errors.tier}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-priority`}>Priority</Label>
          <Input
            id={`${idPrefix}-priority`}
            type="number"
            min={0}
            value={state.priority}
            onChange={(e) => onChange({ priority: e.target.value })}
          />
          {errors.priority && (
            <p className="text-xs text-destructive">{errors.priority}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-exposure`}>Max total exposure (₱)</Label>
        <Input
          id={`${idPrefix}-exposure`}
          type="number"
          min={0}
          value={state.maxTotalExposure}
          onChange={(e) => onChange({ maxTotalExposure: e.target.value })}
        />
        {errors.maxTotalExposure && (
          <p className="text-xs text-destructive">{errors.maxTotalExposure}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-severity`}>Max severity</Label>
          <Select
            value={state.maxSeverity}
            onValueChange={(v) => onChange({ maxSeverity: v ?? '0' })}
          >
            <SelectTrigger id={`${idPrefix}-severity`} className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.maxSeverity && (
            <p className="text-xs text-destructive">{errors.maxSeverity}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-scope`}>Scope</Label>
          <Select
            value={state.scopeType}
            onValueChange={(v) => onChange({ scopeType: v ?? '0' })}
          >
            <SelectTrigger id={`${idPrefix}-scope`} className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCOPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.scopeType && (
            <p className="text-xs text-destructive">{errors.scopeType}</p>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <Label htmlFor={`${idPrefix}-allowNew`} className="text-sm">
            Allow new loans
          </Label>
          <Switch
            id={`${idPrefix}-allowNew`}
            checked={state.allowNew}
            onCheckedChange={(v) => onChange({ allowNew: v })}
          />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md border p-3">
          <Label htmlFor={`${idPrefix}-allowRenewal`} className="text-sm">
            Allow renewals
          </Label>
          <Switch
            id={`${idPrefix}-allowRenewal`}
            checked={state.allowRenewal}
            onCheckedChange={(v) => onChange({ allowRenewal: v })}
          />
        </div>
      </div>
    </div>
  )
}
