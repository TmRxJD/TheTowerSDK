import { describe, expect, it } from 'vitest'
import eecon from '../../fixtures/mechanics/effective-paths-eecon-sweep.fixtures.json'
import ehp from '../../fixtures/mechanics/effective-paths-ehp-sweep.fixtures.json'

/**
 * Are the swept accounts states a player could actually be in?
 *
 * A parity sweep compares a port against the sheet on whatever states the
 * generator produced, and says nothing about whether those states are legal.
 * An illegal one does not fail: the sheet computes something, the port computes
 * the same something, and the comparison passes while testing a player who
 * cannot exist.
 *
 * The one that bit here was the TARGET column. Every lab block is name /
 * Current / Target / Max, and all three captures read Max and ignored Target --
 * but the sheet gates candidates on
 *
 *     IF(ISBLANK(target), level+1 > max, level+1 > target)
 *
 * so a level drawn above the target blanks that upgrade permanently. On eHP
 * that hit 14 of the 20 target-bearing rows, taking Defense Absolute and
 * Defense % off the board on most accounts. The sweep stayed green throughout:
 * an upgrade nobody can buy agrees perfectly.
 */

interface SweepAccount {
  id: string
  cellDiff: Record<string, unknown>
}
interface Sweep {
  baseCells: Record<string, unknown>
  states: SweepAccount[]
}

/** Each tab's lab block: where it starts, and which column holds what. */
const BLOCKS = [
  {
    label: 'eEcon',
    sweep: eecon as unknown as Sweep,
    name: 'BD', current: 'BE', target: 'BF', max: 'BG',
    rows: 31,
  },
  {
    label: 'eHP',
    sweep: ehp as unknown as Sweep,
    name: 'BB', current: 'BC', target: 'BD', max: 'BE',
    rows: 36,
  },
] as const

const FIRST_ROW = 5

interface Reading {
  account: string
  row: number
  name: string
  current: number
  ceiling: number
  hasTarget: boolean
}

function readingsFor(block: typeof BLOCKS[number]): Reading[] {
  const out: Reading[] = []
  for (const account of block.sweep.states) {
    const cells = { ...block.sweep.baseCells, ...account.cellDiff } as Record<string, unknown>
    for (let row = FIRST_ROW; row < FIRST_ROW + block.rows; row += 1) {
      const name = cells[`${block.name}${row}`]
      const current = cells[`${block.current}${row}`]
      const max = cells[`${block.max}${row}`]
      if (typeof name !== 'string' || !name) continue
      if (typeof current !== 'number' || typeof max !== 'number') continue
      const target = cells[`${block.target}${row}`]
      const hasTarget = typeof target === 'number' && target > 0
      out.push({
        account: account.id,
        row,
        name,
        current,
        ceiling: hasTarget ? Math.min(max, target) : max,
        hasTarget,
      })
    }
  }
  return out
}

describe('the swept accounts are states a player could be in', () => {
  for (const block of BLOCKS) {
    describe(block.label, () => {
      const readings = readingsFor(block)

      it('has readings to check at all', () => {
        // Guards the guard: a wrong column letter would silently read nothing
        // and every assertion below would pass on an empty list.
        expect(readings.length).toBeGreaterThan(100)
        expect(new Set(readings.map(r => r.account)).size)
          .toBe(block.sweep.states.length)
      })

      it('never exceeds a lab ceiling', () => {
        // Named, never counted — the lab IS the diagnosis.
        const over = readings
          .filter(r => r.current > r.ceiling)
          .map(r => `${r.account} ${r.name}: ${r.current} > ${r.ceiling}`)
        expect(over).toEqual([])
      })

      it('respects the target where the player has set one', () => {
        /*
         * Separate from the ceiling check on purpose. Both would pass if the
         * generator simply never drew near a limit; this one fails if the
         * target column stops being consulted, which is the regression that
         * actually happened.
         */
        const targeted = readings.filter(r => r.hasTarget)
        if (targeted.length === 0) return
        expect(targeted.filter(r => r.current > r.ceiling)).toEqual([])
      })

      it('is not degenerate — levels move, and no account is all zero', () => {
        /*
         * An all-zero account is the shape the old eHP path fixture had, and it
         * is the weakest state there is: at zero almost every term is its own
         * identity, so a factor that is never applied looks exactly like one
         * applied to nothing.
         */
        const zeros = readings.filter(r => r.current === 0).length
        expect(zeros / readings.length).toBeLessThan(0.5)

        for (const account of block.sweep.states) {
          const mine = readings.filter(r => r.account === account.id)
          expect(mine.some(r => r.current > 0), `${account.id} is all zero`).toBe(true)
        }

        // And the accounts differ from each other, rather than being one state
        // captured N times.
        const signatures = new Set(block.sweep.states.map(a =>
          readings.filter(r => r.account === a.id).map(r => r.current).join(',')))
        expect(signatures.size).toBe(block.sweep.states.length)
      })
    })
  }
})
