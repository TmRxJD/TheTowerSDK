/**
 * Example 3 — Build a tool: what should this player buy next?
 *
 * Puts the three layers together, which is what most tools do:
 *
 *   node      → decode the save file
 *   save      → read what the player has
 *   mechanics → rank what to buy next (Effective Paths)
 *
 * Run it:
 *   npx tsx examples/03-plan-upgrades-from-a-save.ts <path-to-playerInfo.dat>
 */
import { readFile } from 'node:fs/promises'
import { decodePlayerInfoSaveBytes } from 'thetowersdk/node'
import { readLabsFromSaveRoot } from 'thetowersdk/save'
import {
  EFFECTIVE_ECONOMY_UPGRADES,
  planEffectiveEconomyPath,
  ZERO_EFFECTIVE_ECONOMY_LEVELS,
  zeroEffectiveEconomyConfig,
} from 'thetowersdk/mechanics'

async function main(): Promise<void> {
  const savePath = process.argv[2]
  if (!savePath) {
    console.error('Usage: tsx examples/03-plan-upgrades-from-a-save.ts <path-to-playerInfo.dat>')
    process.exit(1)
  }

  const { parsedRoot } = decodePlayerInfoSaveBytes(await readFile(savePath))

  const labs = readLabsFromSaveRoot(parsedRoot)
  if (!labs) {
    console.error('This save has no lab data.')
    process.exit(1)
  }

  /*
   * Step 1 — index the player's labs by the name the game displays.
   *
   * Effective Paths candidates carry a `sheetName`, and for labs it is the
   * same string, so that is the join. If a name ever diverges the candidate
   * lands in the unmapped list below rather than silently reading as zero.
   */
  const labLevelByName = new Map(labs.researches.map(row => [row.displayName, row.level]))

  /*
   * Step 2 — fill a complete levels record.
   *
   * Always start from the zero record. Building one by hand leaves keys
   * `undefined`, which become `NaN` inside the model, and the planner refuses
   * the whole plan rather than rank against them.
   */
  const levels = structuredClone(ZERO_EFFECTIVE_ECONOMY_LEVELS)
  // The bands hold different level shapes; one narrowing keeps the loop plain.
  const bands = levels as unknown as Record<string, Record<string, number>>
  const unmapped: string[] = []

  for (const candidate of EFFECTIVE_ECONOMY_UPGRADES) {
    const level = labLevelByName.get(candidate.sheetName)
    if (level === undefined) {
      unmapped.push(candidate.sheetName)
      continue
    }
    bands[candidate.band][candidate.key] = level
  }

  const mapped = EFFECTIVE_ECONOMY_UPGRADES.length - unmapped.length
  console.log(`Mapped ${mapped} of ${EFFECTIVE_ECONOMY_UPGRADES.length} candidates from this save's labs.`)
  console.log('Not mapped — these are workshop enhancements and module levels rather than labs,')
  console.log('so they come from readWorkshopFromSaveRoot and readModulesFromSaveRoot instead:')
  console.log(`  ${unmapped.join(', ')}\n`)

  /*
   * Step 3 — plan.
   *
   * The config is the other half of an account: what is unlocked, owned and
   * equipped. A zero config owns nothing, which is why weapon-gated candidates
   * appear in `excluded` below. Fill it from the other extractors to see them.
   */
  const plan = planEffectiveEconomyPath({
    config: zeroEffectiveEconomyConfig(),
    levels,
    variant: 'time',
    steps: 10,
    /*
     * The time path costs a purchase in days: a lab's research duration plus
     * the time to farm its coins. That second half needs a rate, and the
     * default is the sheet's own 100,000 coins/hour — far below a developed
     * account, which makes every cost look astronomical. Pass the player's
     * real rate, or set `daysOnly: true` to price research time alone.
     */
    coinsPerHour: 5e11,
  })

  if (plan.issues.length > 0) {
    console.error('The levels could not be used:', plan.issues)
    process.exit(1)
  }

  console.log('Next 10 purchases, best return first:')
  for (const step of plan.steps) {
    console.log(`  ${String(step.step).padStart(2)}. ${step.name.padEnd(30)} `
      + `→ L${step.level}   ${step.cost.toFixed(2)} days`)
  }

  console.log('\nNot offered, and why:')
  for (const entry of plan.excluded.slice(0, 8)) {
    console.log(`  ${entry.sheetName.padEnd(30)} ${entry.reason}`)
  }
}

main().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})
