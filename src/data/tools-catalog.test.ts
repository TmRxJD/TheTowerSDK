import { describe, expect, it } from 'vitest'
import { buildBotToolsHubDescription } from './tools-catalog'

describe('buildBotToolsHubDescription', () => {
  it('keeps hub entries alphabetized and shows requested bot command labels', () => {
    const description = buildBotToolsHubDescription('https://the-tower-run-tracker.com', '850137217828388904')

    expect(description).toContain('[**Battle Report**](https://the-tower-run-tracker.com/) **/track**')
    expect(description).toContain('**Battle Conditions** **/battle_conditions**')
    expect(description).toContain('[**Guardians**](https://the-tower-run-tracker.com/trackers/guardians)')
    expect(description).not.toContain('[**Guardians**](https://the-tower-run-tracker.com/trackers/guardians) **/guardian**')
    expect(description).toContain('[**Lifetime Stats**](https://the-tower-run-tracker.com/trackers/lifetime) **/lifetime**')
    expect(description).toContain('**Ask TowerAI (Experimental)** **/ask**')

    const calculatorsIndex = description.indexOf('**Calculators:**')
    const botsIndex = description.indexOf('[**Bots**](https://the-tower-run-tracker.com/calculators/bots) **/bots**')
    const cphIndex = description.indexOf('[**CPH**](https://the-tower-run-tracker.com/tools?dialog=cph-calculator) **/cph**')
    const guardiansIndex = description.indexOf('[**Guardians**](https://the-tower-run-tracker.com/calculators/guardians) **/guardian**')
    const labsIndex = description.indexOf('[**Labs**](https://the-tower-run-tracker.com/calculators/labs) **/lab**')

    expect(calculatorsIndex).toBeGreaterThanOrEqual(0)
    expect(botsIndex).toBeGreaterThan(calculatorsIndex)
    expect(cphIndex).toBeGreaterThan(botsIndex)
    expect(guardiansIndex).toBeGreaterThan(cphIndex)
    expect(labsIndex).toBeGreaterThan(guardiansIndex)
    expect(description).toContain('**Help & Feedback:**')
    expect(description).toContain('https://discord.com/channels/850137217828388904/1343679564966002779')
  })

  it('uses the fallback feedback link outside the main server', () => {
    const description = buildBotToolsHubDescription('https://the-tower-run-tracker.com', '123')

    expect(description).toContain('https://discord.com/channels/1343406545920196608/1373107292547055718')
  })
})
