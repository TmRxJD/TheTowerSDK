import { z } from 'zod'

export type LocalPersistenceSchemaLike<T = unknown> = {
  parse: (input: unknown) => T
  safeParse: (input: unknown) =>
    | { success: true; data: T }
    | { success: false; error: { issues: unknown } }
}

export function buildNormalizerPersistenceSchema<T>(
  normalize: (input: unknown) => T,
): LocalPersistenceSchemaLike<T> {
  return {
    parse(input: unknown) {
      return normalize(input)
    },
    safeParse(input: unknown) {
      try {
        return { success: true as const, data: normalize(input) }
      } catch (error) {
        if (error instanceof z.ZodError) {
          return { success: false as const, error: { issues: error.issues } }
        }
        return {
          success: false as const,
          error: { issues: [{ message: error instanceof Error ? error.message : String(error) }] },
        }
      }
    },
  }
}
