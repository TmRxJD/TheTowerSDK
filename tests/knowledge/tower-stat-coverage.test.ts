import { describe, expect, it } from 'vitest'
import {
  BERSERKER_DAMAGE_MULTIPLIER_CAP,
  PERK_INDEX_40,
  TOWER_DAMAGE_CHAIN_EVERY_STORE_IS_FMUL,
  TOWER_DAMAGE_MULTIPLIER_CHAIN,
  TOWER_STAT_COMPUTED_SEPARATELY,
  TOWER_STAT_DISABLE_GATES,
  TOWER_STAT_EXPECTED_ENTITY,
  TOWER_STAT_RECOMPUTE_ORDER,
  TOWER_STATS_THAT_MISRESOLVE,
  TOWER_STATS_THAT_RESOLVE,
  towerStatDisplayName,
} from '../../src/data/player-stats/recompute-order'
import { findPerkCatalogRow, PERK_EFFECT_SITES } from '../../src/save/catalogs/perks'
import { resolveWithConfidence } from '../../src/knowledge'

/**
 * The game's own stat list, used as a denominator.
 *
 * `Main.CalculateUpgradeBonuses` names 46 stats. The question this file asks is
 * not "does the oracle know about tower stats" — it obviously does — but "for
 * each of the 46, does asking by name get you the right thing?"
 *
 * The answer is not simply yes or no, and that is the point. Every one of the
 * 46 resolves to SOMETHING. Seven resolve to the wrong thing, at strong or weak
 * confidence, never at none. A name that resolves to nothing gets noticed; a
 * name that resolves to a plausible neighbour gets used.
 */

describe('the game names 46 tower stats and we can find them', () => {
  it('has no name resolve to nothing', () => {
    const unresolved = TOWER_STAT_RECOMPUTE_ORDER
      .filter(stat => resolveWithConfidence(towerStatDisplayName(stat)).confidence === 'none')

    expect(unresolved, `no entity anywhere for: ${unresolved.join(', ')}`).toEqual([])
  })

  it('keeps the misresolving list honest in BOTH directions', () => {
    /*
     * The failure this guards is a stale allowance — the shape CLAUDE.md calls
     * out, where a documented known-bad list outlives the bug and starts hiding
     * a regression.
     *
     * So: everything on the list must still misresolve (or it should be removed
     * and celebrated), and nothing off the list may quietly join it. The second
     * half is checked by pinning the ids the good ones resolve to.
     */
    for (const [stat, why] of Object.entries(TOWER_STATS_THAT_MISRESOLVE)) {
      const resolution = resolveWithConfidence(towerStatDisplayName(stat))
      expect(resolution.id, `${stat} now resolves to nothing — update the list`).not.toBeNull()
      expect(
        resolution.confidence,
        `${stat} is listed as misresolving (${why}) but is now exact — remove it from the list`,
      ).not.toBe('exact')
    }

    expect(TOWER_STATS_THAT_RESOLVE.length + Object.keys(TOWER_STATS_THAT_MISRESOLVE).length)
      .toBe(TOWER_STAT_RECOMPUTE_ORDER.length)
  })

  it('pins where each good stat lands, so the bad list cannot be edited away', () => {
    /*
     * The count check above is not enough on its own: deleting an entry from
     * TOWER_STATS_THAT_MISRESOLVE moves both sides of it together and passes.
     * Verified by planting exactly that — removing `AttackRange` from the list
     * changed nothing. This is the check that bites, because `AttackRange`
     * would then have to resolve to an id named below, and it resolves to
     * `enemy.ranged`.
     */
    for (const stat of TOWER_STATS_THAT_RESOLVE) {
      const expected = TOWER_STAT_EXPECTED_ENTITY[stat]
      expect(expected, `${stat} is not on the bad list and has no expected entity`).toBeDefined()
      expect(resolveWithConfidence(towerStatDisplayName(stat)).id, stat).toBe(expected)
    }
  })

  it('resolves the unambiguous ones exactly, which is what makes the rest a finding', () => {
    /*
     * If nothing resolved exactly, the whole exercise would just be measuring a
     * weak scorer. These do, so the nine are a genuine gap rather than noise.
     */
    const exact = TOWER_STAT_RECOMPUTE_ORDER
      .filter(stat => resolveWithConfidence(towerStatDisplayName(stat)).confidence === 'exact')

    expect(exact.length, 'a scorer this weak would prove nothing').toBeGreaterThanOrEqual(8)
    expect(exact).toContain('AttackSpeed')
    expect(exact).toContain('DeathDefy')
    expect(exact).toContain('Lifesteal')
  })

  it('lists the disable gates separately from the stats they gate', () => {
    // They are calls in the same function but they are not stats, and folding
    // them into the list would make the count wrong by three.
    for (const gate of TOWER_STAT_DISABLE_GATES) {
      expect(TOWER_STAT_RECOMPUTE_ORDER).not.toContain(gate)
    }
    expect(TOWER_STAT_DISABLE_GATES).toHaveLength(3)
  })

  it('has no duplicate stat, since the order is a call sequence', () => {
    expect(new Set(TOWER_STAT_RECOMPUTE_ORDER).size).toBe(TOWER_STAT_RECOMPUTE_ORDER.length)
  })

  it('says out loud that Damage is missing from the list', () => {
    /*
     * `CalculateUpgradeBonuses` walks 46 getters and computes damage in NEITHER
     * of them — `CalculateDamageUpgradeBonuses` does, and is called first. A
     * list of 46 that omits the stat every build is measured by is worse than
     * no list, because it reads as complete.
     *
     * So the omission is a named export, and this asserts the two stay
     * disjoint: if Damage is ever added to the order, this fails and the
     * separate-function note has to be revisited with it.
     */
    expect(TOWER_STAT_RECOMPUTE_ORDER).not.toContain(TOWER_STAT_COMPUTED_SEPARATELY)
    expect(TOWER_STAT_COMPUTED_SEPARATELY).toBe('Damage')
  })

  it('models the damage chain as a pure product, matching the binary', () => {
    /*
     * Thirteen stores to Main.damage (0x3C8), every one of them from an `fmul`.
     * The step count is load-bearing: it is how many multipliers the game
     * applies, and a model with fewer has silently dropped a source.
     */
    expect(TOWER_DAMAGE_CHAIN_EVERY_STORE_IS_FMUL).toBe(true)
    expect(TOWER_DAMAGE_MULTIPLIER_CHAIN).toHaveLength(13)
    expect(TOWER_DAMAGE_MULTIPLIER_CHAIN.filter(step => step.includes('vault'))).toHaveLength(2)

    /*
     * The correction. "Every store is an fmul" is true and is NOT the same
     * claim as "no term is additive" — Berserker is an addition written as a
     * multiplier. The chain must keep saying so.
     */
    const berserker = TOWER_DAMAGE_MULTIPLIER_CHAIN.find(step => step.includes('Berserker'))
    expect(berserker, 'Berserker must stay named in the chain').toBeDefined()
    expect(berserker).toMatch(/ADDITION/)
    expect(BERSERKER_DAMAGE_MULTIPLIER_CAP).toBe(8)
  })

  it('has perk 40 resolved against behaviour, not against another list', () => {
    /*
     * This case used to assert the conflict was RECORDED. It is now resolved:
     * the catalog had 40 and 48 transposed, and the game settles it — 40 raises
     * tower damage and penalises boss health.
     *
     * The assertion is on the effect sites rather than the name, because the
     * name is the thing that was wrong.
     */
    expect(PERK_INDEX_40.benefitAppliedIn).toBe(PERK_EFFECT_SITES[40].up)
    expect(PERK_INDEX_40.penaltyAppliedIn).toBe(PERK_EFFECT_SITES[40].down)
    expect(findPerkCatalogRow(PERK_INDEX_40.index)?.name).toBe(PERK_INDEX_40.name)
  })
})
