import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { CHART_CALCULATOR_LINKS } from './chart-calculator-links'
import { SHARED_CHART_REGISTRY } from './chart-registry'
import { CALCULATOR_IDS } from '../mechanics/calculators'

/**
 * The chart → formula link, checked against both ends.
 *
 * A link is only worth something if it resolves. A handle pointing at nothing
 * sends an agent looking for a calculator that does not exist, which is worse
 * than no link at all: it stops the search that would have found the real one.
 */

describe('every chart the site publishes is linked', () => {
  it('covers every renderer key in the registry, with none left over', () => {
    const rendered = [...new Set(SHARED_CHART_REGISTRY.map(entry => entry.rendererKey))].sort()
    const linked = Object.keys(CHART_CALCULATOR_LINKS).sort()
    // Both directions. A missing key is an unlinked chart; a surplus one is a
    // link to a chart that no longer exists, and both go stale silently.
    expect(linked).toEqual(rendered)
  })

  it('names 46 charts across 27 renderers', () => {
    // 46, not 48. An earlier count grepped for `pathId:` and caught two
    // occurrences outside the array.
    expect(SHARED_CHART_REGISTRY.length).toBe(46)
    expect(Object.keys(CHART_CALCULATOR_LINKS)).toHaveLength(27)
  })
})

describe('every link resolves', () => {
  it('points only at calculator handles that exist', () => {
    const known = new Set(CALCULATOR_IDS)
    for (const [renderer, link] of Object.entries(CHART_CALCULATOR_LINKS)) {
      for (const id of link.calculators) {
        expect(known.has(id), `${renderer} -> ${id}`).toBe(true)
      }
    }
  })

  it('points only at data symbols the charts modules export', () => {
    const dir = __dirname
    const sources = fs.readdirSync(dir)
      .filter(name => name.endsWith('.ts') && !name.endsWith('.test.ts'))
      .map(name => fs.readFileSync(path.join(dir, name), 'utf8'))
      .join('\n')
    // `chart-tables.ts` lives under data/, so the rows it holds are looked up
    // there rather than here.
    const tables = fs.readFileSync(
      path.join(dir, '..', 'data', 'chart-tables.ts'), 'utf8')

    for (const [renderer, link] of Object.entries(CHART_CALCULATOR_LINKS)) {
      if (!link.data) continue
      const exported = new RegExp(`export\\s+const\\s+${link.data}\\b`)
      expect(
        exported.test(sources) || exported.test(tables),
        `${renderer} names data "${link.data}", which nothing exports`,
      ).toBe(true)
    }
  })
})

describe('the gaps are stated rather than implied', () => {
  it('gives every formula-less chart a reason', () => {
    /*
     * An empty `calculators` list means the SDK cannot recompute that chart —
     * its rows are measured. That is a real finding, so it has to carry a note.
     * Without one, "no calculators" is indistinguishable from "nobody looked".
     */
    for (const [renderer, link] of Object.entries(CHART_CALCULATOR_LINKS)) {
      if (link.calculators.length > 0) continue
      expect(link.note, `${renderer} has no calculators and no reason`).toBeTruthy()
      expect((link.note ?? '').length, renderer).toBeGreaterThan(15)
    }
  })

  it('reports how much of the chart surface is computable', () => {
    const links = Object.values(CHART_CALCULATOR_LINKS)
    const withFormula = links.filter(link => link.calculators.length > 0)
    // Eight of twenty-seven renderers have a formula behind them. The rest are
    // measured tables. Pinned so the number has to be updated deliberately when
    // a formula is added — which is the point of tracking it at all.
    expect(withFormula).toHaveLength(8)
    expect(links.filter(link => link.data)).toHaveLength(22)
  })
})
