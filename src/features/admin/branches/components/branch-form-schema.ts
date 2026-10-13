import { z } from 'zod'

export const createBranchSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(8, 'Code must be at most 8 characters'),
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(200, 'Name must be at most 200 characters'),
  areaCode: z
    .string()
    .trim()
    .min(1, 'Area code is required')
    .max(16, 'Area code must be at most 16 characters'),
})

export const updateBranchSchema = createBranchSchema.omit({ code: true })

export type CreateBranchForm = z.infer<typeof createBranchSchema>
export type UpdateBranchForm = z.infer<typeof updateBranchSchema>

export const emptyCreateForm: CreateBranchForm = {
  code: '',
  name: '',
  areaCode: '',
}
