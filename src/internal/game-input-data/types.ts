import { z } from 'zod'

export const gameDropdownOptionEntrySchema = z.object({
  value: z.number(),
  baseValue: z.number(),
})

export type GameDropdownOptionEntry = z.infer<typeof gameDropdownOptionEntrySchema>

export interface StandardDropdownOption {
  value: number
  label: string
  subtitle?: string
}

export interface GameDataRegistryItem {
  schema: typeof gameDropdownOptionEntrySchema
  data: readonly GameDropdownOptionEntry[]
}
