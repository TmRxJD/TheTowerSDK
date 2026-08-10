/**
 * Validates every public data table against its declared schema.
 *
 * A table can drift from its documented shape without types noticing, because
 * types are gone at runtime. This is the check that actually reads the values.
 */
import { describe, expect, it } from 'vitest'

import * as data from './index'
import * as save from '../save/index'
import { DATA_TABLE_SCHEMAS } from './schemas'

// Tables live in whichever entry point owns them: catalogs used for save import
// are exported from `save`, everything else from `data`. The schema contract is
// about shape, not location, so both are searched.
const publicApi: Record<string, unknown> = { ...data, ...save }

describe('public data tables match their schemas', () => {
  for (const [exportName, spec] of Object.entries(DATA_TABLE_SCHEMAS)) {
    it(`${exportName}`, () => {
      const value = publicApi[exportName]
      expect(value, `${exportName} is not exported from thetowersdk/data or /save`).toBeDefined()

      const failures: string[] = []
      const check = (candidate: unknown, where: string) => {
        const result = spec.schema.safeParse(candidate)
        if (!result.success && failures.length < 5) {
          failures.push(`${where}: ${result.error.issues[0]?.message ?? 'invalid'}`)
        }
      }

      if (spec.kind === 'array') {
        expect(Array.isArray(value)).toBe(true)
        ;(value as unknown[]).forEach((entry, i) => check(entry, `[${i}]`))
      } else if (spec.kind === 'record') {
        for (const [key, entry] of Object.entries(value as object)) check(entry, key)
      } else if (spec.kind === 'recordOfRecords') {
        for (const [outer, inner] of Object.entries(value as object)) {
          for (const [key, entry] of Object.entries(inner as object)) check(entry, `${outer}.${key}`)
        }
      } else if (spec.kind === 'recordOfArrays') {
        for (const [group, entries] of Object.entries(value as object)) {
          if (!Array.isArray(entries)) continue
          entries.forEach((entry, i) => check(entry, `${group}[${i}]`))
        }
      }

      expect(failures, `${exportName} has entries that do not match its schema`).toEqual([])
    })
  }
})
