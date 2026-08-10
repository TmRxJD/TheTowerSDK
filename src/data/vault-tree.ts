// The SDK ships English game text only, so localization is an identity pass.
// This matches platform exactly when no governed-text catalog is loaded:
// resolveLocalizedSharedChartText() falls through to the trimmed input.
//
// This severs the closure's only edge to @tmrxjd/tracker-languages, which the
// SDK cannot depend on for two independent reasons:
//   1. tracker-languages imports @tmrxjd/platform, and platform will import the
//      SDK -- that is a circular package dependency.
//   2. tracker-languages is GPL-3.0-or-later; this package is MIT.
// (Registry visibility is NOT the blocker -- making it public would not help.)
const resolveLocalizedSharedChartText = (value: string): string => String(value || '').trim()

export interface VaultTreeNode {
  id: string
  name: string
  cost: number | number[]
  col: number
  row: number
  parents: string[]
}

export const harmonyTreeNodes: readonly VaultTreeNode[] = [
  { id: 'discount1', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 0, parents: [] },
  { id: 'cardslot1', name: '1 Additional Card Slot', cost: 10, col: 0, row: 1, parents: ['discount2'] },
  { id: 'discount2', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 1, parents: ['discount1'] },
  { id: 'demon', name: 'Demon Mode Automation', cost: 10, col: 2, row: 1, parents: ['discount2'] },
  { id: 'freemission', name: 'Free Mission Reroll', cost: 25, col: 0, row: 2, parents: ['discount3'] },
  { id: 'discount3', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 2, parents: ['discount2'] },
  { id: 'smartdemon', name: 'Smart Demon Mode Automation', cost: 15, col: 2, row: 2, parents: ['demon'] },
  { id: 'nukeauto', name: 'Nuke Automation', cost: 10, col: 0, row: 3, parents: ['discount4'] },
  { id: 'discount4', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 3, parents: ['discount3'] },
  { id: 'workshoprespec1', name: 'Workshop Respec Discount', cost: 15, col: 2, row: 3, parents: ['discount4'] },
  { id: 'smartnuke', name: 'Smart Nuke Automation', cost: 15, col: 0, row: 4, parents: ['nukeauto'] },
  { id: 'discount5', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 4, parents: ['discount4'] },
  { id: 'workshoprespec2', name: 'Workshop Respec Discount', cost: 20, col: 2, row: 4, parents: ['workshoprespec1'] },
  { id: 'cardslot2', name: '1 Additional Card Slot', cost: 15, col: 0, row: 5, parents: ['discount6'] },
  { id: 'discount6', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 5, parents: ['discount5'] },
  { id: 'workshoprespec3', name: 'Workshop Respec Discount', cost: 25, col: 2, row: 5, parents: ['workshoprespec2'] },
  { id: 'adgems1', name: 'Ad gems Stack x2', cost: 15, col: 0, row: 6, parents: ['discount7'] },
  { id: 'discount7', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 6, parents: ['discount6'] },
  { id: 'workshoppresets', name: '+5 Workshop Presets', cost: 30, col: 2, row: 6, parents: ['workshoprespec3'] },
  { id: 'adgems2', name: 'Ad gems Stack x3', cost: 20, col: 0, row: 7, parents: ['adgems1'] },
  { id: 'discount8', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 7, parents: ['discount7'] },
  { id: 'cardslot4', name: '1 Additional Card Slot', cost: 20, col: 2, row: 7, parents: ['discount8'] },
  { id: 'adgems3', name: 'Ad gems Stack x5', cost: 25, col: 0, row: 8, parents: ['adgems2'] },
  { id: 'discount9', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 8, parents: ['discount8'] },
  { id: 'missileauto', name: 'Missile Barrage Automation', cost: 10, col: 2, row: 8, parents: ['discount9'] },
  { id: 'cardslot3', name: '1 Additional Card Slot', cost: 25, col: 0, row: 9, parents: ['discount10'] },
  { id: 'discount10', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 9, parents: ['discount9'] },
  { id: 'smartmissile', name: 'Smart Missile Barrage Automation', cost: 15, col: 2, row: 9, parents: ['missileauto'] },
  { id: 'dailymission', name: 'Daily Mission - Set Shard Type', cost: 35, col: 0, row: 10, parents: ['freemission'] },
  { id: 'discount11', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 10, parents: ['discount10'] },
  { id: 'autoshatter', name: 'Auto Shatter Rare Modules', cost: 25, col: 2, row: 10, parents: ['discount11'] },
  { id: 'autorestart', name: 'Auto Restart Run', cost: 20, col: 0, row: 11, parents: ['discount12'] },
  { id: 'discount12', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 11, parents: ['discount11'] },
  { id: 'cardslot5', name: '1 Additional Card Slot', cost: 35, col: 2, row: 11, parents: ['discount12'] },
  { id: 'discount13', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 12, parents: ['discount12'] },
  { id: 'autoberzerk', name: 'Auto Charge Berzerker', cost: 10, col: 2, row: 12, parents: ['discount13'] },
  { id: 'botrespec1', name: '100 Bot Respec Discount', cost: 15, col: 0, row: 13, parents: ['discount14'] },
  { id: 'discount14', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 13, parents: ['discount13'] },
  { id: 'damagecap', name: 'Damage Cap Slider', cost: 35, col: 2, row: 13, parents: ['autoberzerk'] },
  { id: 'botrespec2', name: '100 Bot Respec Discount', cost: 20, col: 0, row: 14, parents: ['botrespec1'] },
  { id: 'discount15', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 14, parents: ['discount14'] },
  { id: 'workshoporb', name: 'Workshop Orb Adjuster', cost: 20, col: 2, row: 14, parents: ['discount15'] },
  { id: 'botrespec3', name: '100 Bot Respec Discount', cost: 25, col: 0, row: 15, parents: ['botrespec2'] },
  { id: 'discount16', name: '2.5% Discount Rerolls', cost: 5, col: 1, row: 15, parents: ['discount15'] },
  { id: 'cardslot6', name: '1 Additional Card Slot', cost: 45, col: 2, row: 15, parents: ['discount16'] },
  { id: 'botpreset', name: 'Bot Presets', cost: 30, col: 0, row: 16, parents: ['botrespec3'] },
  { id: 'discount17', name: '2.5% Discount Enhancements', cost: 5, col: 1, row: 16, parents: ['discount16'] },
  { id: 'botslider', name: 'Bot Cooldown Slider', cost: 25, col: 2, row: 16, parents: ['discount17'] },
] as const

export const powerTreeNodes: readonly VaultTreeNode[] = [
  { id: 'ultdmg1', name: '5% Ultimate Weapon Damage', cost: 15, col: 1, row: 0, parents: [] },
  { id: 'botrange1', name: '2m Bot Range', cost: 20, col: 1, row: 1, parents: ['ultdmg1'] },
  { id: 'defabs', name: '5% Defense Absolute', cost: [5, 10, 20], col: 0, row: 2, parents: ['botrange1'] },
  { id: 'dmgmeter', name: '5% Damage / Meter', cost: [10, 20, 40], col: 1, row: 2, parents: ['botrange1'] },
  { id: 'cash', name: '5% Cash', cost: [5, 10, 20], col: 2, row: 2, parents: ['botrange1'] },
  { id: 'healthregen', name: '5% Health Regen', cost: [10, 20, 40], col: 0, row: 3, parents: ['defabs'] },
  { id: 'crit1', name: '1% Critical Chance', cost: [15, 30, 60], col: 1, row: 3, parents: ['dmgmeter'] },
  { id: 'coinskill', name: '5% Coins / Kill', cost: [15, 30, 60], col: 2, row: 3, parents: ['cash'] },
  { id: 'health', name: '5% Health', cost: [15, 30, 60], col: 0, row: 4, parents: ['healthregen'] },
  { id: 'dmg', name: '5% Damage', cost: [15, 30, 60], col: 1, row: 4, parents: ['crit1'] },
  { id: 'enemyatk', name: '0.5% Enemy Attack Skip', cost: [25, 50, 100], col: 2, row: 4, parents: ['coinskill'] },
  { id: 'defperc', name: '0.5% Defense %', cost: [25, 50, 100], col: 0, row: 5, parents: ['health'] },
  { id: 'supercrit', name: '2% Super Crit Chance', cost: [25, 50, 100], col: 1, row: 5, parents: ['defperc', 'dmg', 'enemyhealth'] },
  { id: 'enemyhealth', name: '0.5% Enemy Health Skip', cost: [25, 50, 100], col: 2, row: 5, parents: ['enemyatk'] },
  { id: 'ultdmg2', name: '5% Ultimate Weapon Damage', cost: 15, col: 1, row: 6, parents: ['supercrit'] },
  { id: 'tier2', name: 'Tier x2 Unlock       Requires: 15x T1 unlocks', cost: 50, col: 2, row: 6, parents: ['ultdmg2'] },
  { id: 'botrange2', name: '2m Bot Range', cost: 20, col: 1, row: 7, parents: ['ultdmg2'] },
  { id: 'thorn', name: '5% Thorn Damage', cost: [20, 40, 80], col: 0, row: 8, parents: ['botrange2'] },
  { id: 'rendarmormult', name: '5% Rend Armor Mult', cost: [20, 40, 80], col: 1, row: 8, parents: ['botrange2'] },
  { id: 'recovery', name: '5% Recovery Amount', cost: [15, 30, 60], col: 2, row: 8, parents: ['botrange2'] },
  { id: 'knockback', name: '5% Knockback Force', cost: [25, 50, 100], col: 0, row: 9, parents: ['thorn'] },
  { id: 'critfactor', name: '5% Critical Factor', cost: [25, 50, 100], col: 1, row: 9, parents: ['rendarmormult'] },
  { id: 'freeatk', name: '5% Free Attack Upgrade', cost: [25, 50, 100], col: 2, row: 9, parents: ['recovery'] },
  { id: 'orbspeed', name: '5% Orb Speed', cost: [25, 50, 100], col: 0, row: 10, parents: ['knockback'] },
  { id: 'attackspeed', name: '5% Attack Speed', cost: [25, 50, 100], col: 1, row: 10, parents: ['critfactor'] },
  { id: 'freedef', name: '5% Free Defense Upgrade', cost: [25, 50, 100], col: 2, row: 10, parents: ['freeatk'] },
  { id: 'wallrebuild', name: '-20s Wall Rebuild', cost: 25, col: 0, row: 11, parents: ['orbspeed'] },
  { id: 'supercritmult', name: '5% Super Crit Mult', cost: [25, 50, 100], col: 1, row: 11, parents: ['wallrebuild', 'attackspeed', 'freeutil'] },
  { id: 'freeutil', name: '5% Free Utility Upgrade', cost: [25, 50, 100], col: 2, row: 11, parents: ['freedef'] },
  { id: 'ultdmg3', name: '5% Ultimate Weapon Damage', cost: 15, col: 1, row: 12, parents: ['supercritmult'] },
  { id: 'tier3', name: 'Tier x3 Unlock      Requires: 30x T1 & 15x T2', cost: 100, col: 2, row: 12, parents: ['freeutil'] },
  { id: 'botrange3', name: '2m Bot Range', cost: 20, col: 1, row: 13, parents: ['ultdmg3'] },
  { id: 'knockbackchance', name: '2% Knockback Chance', cost: [20, 40, 80], col: 0, row: 14, parents: ['botrange3'] },
  { id: 'rendarmorchance', name: '4% Rend Armor Chance', cost: [15, 30, 60], col: 1, row: 14, parents: ['botrange3'] },
  { id: 'maxrecovery', name: '20% Max Recovery', cost: [10, 20, 40], col: 2, row: 14, parents: ['botrange3'] },
  { id: 'shockwave', name: '-1s Shockwave Frequency', cost: 15, col: 0, row: 15, parents: ['knockbackchance'] },
  { id: 'rapidfire', name: '4% Rapid Fire Chance', cost: [15, 30, 60], col: 1, row: 15, parents: ['rendarmorchance'] },
  { id: 'interest', name: '10% Interest / Wave', cost: [10, 20, 40], col: 2, row: 15, parents: ['maxrecovery'] },
  { id: 'deathdefy', name: '2% Death Defy', cost: [25, 50, 100], col: 0, row: 16, parents: ['shockwave'] },
  { id: 'multichance', name: '4% Multishot Chance', cost: [20, 40, 80], col: 1, row: 16, parents: ['rapidfire'] },
  { id: 'cashwave', name: '100% Cash / Wave', cost: [10, 20, 40], col: 2, row: 16, parents: ['interest'] },
  { id: 'orbs', name: '1 Orbs', cost: 30, col: 0, row: 17, parents: ['deathdefy'] },
  { id: 'bouncchance', name: '4% Bounce Shot Chance', cost: [20, 40, 80], col: 1, row: 17, parents: ['orbs', 'multichance', 'coinswave'] },
  { id: 'coinswave', name: '100% Coins / Wave', cost: [10, 20, 40], col: 2, row: 17, parents: ['cashwave'] },
  { id: 'ultdmg4', name: '5% Ultimate Weapon Damage', cost: 15, col: 1, row: 18, parents: ['bouncchance'] },
  { id: 'botrange4', name: '2m Bot Range', cost: 20, col: 1, row: 19, parents: ['ultdmg4'] },
] as const

export const DEFAULT_HARMONY_VAULT_NODES = harmonyTreeNodes
export const DEFAULT_POWER_VAULT_NODES = powerTreeNodes

function getNodeCostLabels(node: VaultTreeNode): string {
  if (Array.isArray(node.cost)) {
    return node.cost.map(value => String(value)).join(' / ')
  }
  return String(node.cost)
}

export function buildVaultTreeRows(nodes: readonly VaultTreeNode[]): string[][] {
  const byId = new Map(nodes.map(node => [node.id, node]))

  return [...nodes]
    .sort((left, right) => {
      if (left.row !== right.row) return left.row - right.row
      return left.col - right.col
    })
    .map(node => {
      const localizedName = resolveLocalizedSharedChartText(node.name)
      const prereq = node.parents
        .map(parentId => {
          const parentName = byId.get(parentId)?.name ?? parentId
          return resolveLocalizedSharedChartText(parentName)
        })
        .join(', ')

      return [
        `R${node.row + 1}C${node.col + 1}`,
        localizedName,
        getNodeCostLabels(node),
        prereq || '-',
      ]
    })
}
