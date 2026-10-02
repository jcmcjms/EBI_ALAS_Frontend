import { useFormContext, useWatch } from 'react-hook-form'
import { Input } from '@/src/shared/ui/input'
import { Label } from '@/src/shared/ui/label'
import {
  Buildings,
  LockSimple,
  UserCirclePlus,
  WarningCircle,
} from '@phosphor-icons/react'

import { cn } from '@/src/shared/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/src/shared/ui/select'

import { SectionCard } from './section-card'
import { getSection } from '@/src/features/loans/constants/sections'
import type { LoanApplicationFormData } from '@/src/features/loans/schemas/schema'

export function PersonalInfoSection() {
  const {
    control,
    register,
    setValue,
    formState: { errors },
  } = useFormContext<LoanApplicationFormData>()
  const clientErrors = errors.client

  const suffix = useWatch({ control, name: 'client.suffix' })

  const getErrorProps = (fieldName: 'school' | 'referrer') => {
    const error = clientErrors?.[fieldName]
    return {
      'aria-invalid': !!error,
      className: cn(
        'h-9',
        error && 'border-destructive focus-visible:ring-destructive',
      ),
    }
  }

  const section = getSection('personal-info')

  return (
    <SectionCard
      step={section.step}
      title={section.label}
      description={section.description}
      systemSourced
      icon={<LockSimple size={20} weight="bold" className="text-primary" />}
    >
      <div className="space-y-6">
        {}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">First Name</Label>
            <Input
              {...register('client.firstName')}
              readOnly
              className="h-9 cursor-default bg-muted/50 font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Middle Name</Label>
            <Input
              {...register('client.middleName')}
              readOnly
              className="h-9 cursor-default bg-muted/50 font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Last Name</Label>
            <Input
              {...register('client.lastName')}
              readOnly
              className="h-9 cursor-default bg-muted/50 font-medium"
            />
          </div>

          {}
          <div className="space-y-1.5">
            <Label
              htmlFor="client-suffix"
              className="text-xs text-muted-foreground"
            >
              Suffix
            </Label>
            <Select
              value={suffix || null}
              onValueChange={(value) =>
                setValue('client.suffix', value ?? '', {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
            >
              <SelectTrigger id="client-suffix" className="h-9 w-full">
                <SelectValue placeholder="Select suffix" />
              </SelectTrigger>
              <SelectContent>
                {}
                <SelectItem value="">None</SelectItem>
                <SelectSeparator />
                <SelectItem value="Jr.">Jr.</SelectItem>
                <SelectItem value="Sr.">Sr.</SelectItem>
                <SelectItem value="II">II</SelectItem>
                <SelectItem value="III">III</SelectItem>
                <SelectItem value="IV">IV</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Birthdate</Label>
            <Input
              {...register('client.birthdate')}
              readOnly
              type="date"
              className="h-9 cursor-default bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Employee #</Label>
            <Input
              {...register('client.employeeId')}
              readOnly
              className="h-9 cursor-default bg-muted/50 tabular-nums text-xs"
            />
          </div>

          {}
          <div className="space-y-1.5 md:col-span-3">
            <Label className="text-xs text-muted-foreground">Address</Label>
            <Input
              {...register('client.address')}
              readOnly
              className="h-9 cursor-default bg-muted/50"
            />
          </div>

          {}
          <div className="space-y-1.5 md:col-span-2">
            <Label className="text-xs text-muted-foreground">Agency Type</Label>
            <Input
              {...register('client.agency')}
              readOnly
              className="h-9 cursor-default bg-muted/50 font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Position / Title
            </Label>
            <Input
              {...register('client.position')}
              readOnly
              className="h-9 cursor-default bg-muted/50"
            />
          </div>

          {}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">MIS Agency</Label>
            <Input
              {...register('client.misAgency')}
              readOnly
              className="h-9 cursor-default bg-muted/50 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Length of Service
            </Label>
            <Input
              {...register('client.lengthOfService')}
              readOnly
              className="h-9 cursor-default bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">NTHP</Label>
            <Input
              {...register('client.netTakeHomePay')}
              readOnly
              className="h-9 cursor-default bg-muted/50 font-bold"
            />
          </div>

          {}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Region</Label>
            <Input
              {...register('client.region')}
              readOnly
              className="h-9 cursor-default bg-muted/50"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Division Code
            </Label>
            <Input
              {...register('client.divisionCode')}
              readOnly
              className="h-9 cursor-default bg-muted/50 tabular-nums text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Station Code
            </Label>
            <Input
              {...register('client.stationCode')}
              readOnly
              className="h-9 cursor-default bg-muted/50 tabular-nums text-xs"
            />
          </div>
        </div>

        {}
        <div className="border-t pt-6">
          <div className="mb-4 flex items-center gap-2">
            <Buildings size={20} weight="bold" className="text-primary" />
            <h3 className="text-md font-semibold">Referrer Information</h3>
          </div>
          <p className="mb-6 text-xs text-muted-foreground">
            Details not present in the core banking system. Please verify with
            the borrower.
          </p>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {}
            <div className="space-y-1.5">
              <Label
                htmlFor="client.school"
                className="flex items-center gap-1.5 text-xs"
              >
                <Buildings size={14} weight="bold" />
                School/Agency
              </Label>
              <Input
                id="client.school"
                {...register('client.school')}
                placeholder="e.g. Department of Education"
                {...getErrorProps('school')}
              />
              <p className="text-[11px] text-muted-foreground">
                School or agency where the referrer works.
              </p>
              {clientErrors?.school?.message && (
                <p
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                  role="alert"
                >
                  <WarningCircle size={12} weight="fill" />
                  {clientErrors.school.message}
                </p>
              )}
            </div>

            {}
            <div className="space-y-1.5">
              <Label
                htmlFor="client.referrer"
                className="flex items-center gap-1.5 text-xs"
              >
                <UserCirclePlus size={14} weight="bold" />
                Referrer
              </Label>
              <Input
                id="client.referrer"
                {...register('client.referrer')}
                placeholder="e.g. Employee Referral, Walk-in, Agent Name"
                {...getErrorProps('referrer')}
              />
              <p className="text-[11px] text-muted-foreground">
                Name of the person or campaign that referred the borrower.
              </p>
              {clientErrors?.referrer?.message && (
                <p
                  className="flex items-center gap-1 text-xs font-medium text-destructive"
                  role="alert"
                >
                  <WarningCircle size={12} weight="fill" />
                  {clientErrors.referrer.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  )
}
