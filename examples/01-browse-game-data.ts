/**
 * Example 1 — Use the game data with no save file at all.
 *
 * The simplest thing the SDK does: it hands you the game's own tables as typed
 * arrays. Useful for cost calculators, planners, wikis, or anything that needs
 * to know what the game contains.
 *
 * Run it:
 *   npx tsx examples/01-browse-game-data.ts
 */
import { generatedLabs, type GeneratedLabRecord } from 'thetowersdk/data'

console.log(`The game has ${generatedLabs.length} labs.\n`)

// Each lab record is { name, type?, base?, value?, levels? }, where every entry
// in `levels` is { level, duration, cost? }.
const [firstLab] = generatedLabs
console.log(`Example record: ${firstLab.name} (${firstLab.type ?? 'untyped'})`)
console.log(`  ${firstLab.levels?.length ?? 0} levels`)
console.log(`  level 1 -> cost ${firstLab.levels?.[0]?.cost}, duration ${firstLab.levels?.[0]?.duration}`)
console.log()

// A real question: what does it cost to max each lab? Sum its level costs.
const totalCostToMax = (lab: GeneratedLabRecord): number =>
  (lab.levels ?? []).reduce((sum, level) => sum + (level.cost ?? 0), 0)

const ranked = generatedLabs
  .map((lab) => ({ name: lab.name, type: lab.type ?? '-', total: totalCostToMax(lab) }))
  .filter((lab) => lab.total > 0)
  .sort((a, b) => b.total - a.total)

console.log('10 most expensive labs to max (sum of all level costs):')
for (const lab of ranked.slice(0, 10)) {
  console.log(`  ${lab.name.padEnd(32)} ${lab.type.padEnd(12)} ${lab.total.toExponential(3)}`)
}
console.log()

// Group by category, the way a planner UI would.
const byType = new Map<string, number>()
for (const lab of generatedLabs) {
  const type = lab.type ?? 'Uncategorized'
  byType.set(type, (byType.get(type) ?? 0) + 1)
}
console.log('Labs per category:')
for (const [type, count] of [...byType].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(20)} ${count}`)
}
