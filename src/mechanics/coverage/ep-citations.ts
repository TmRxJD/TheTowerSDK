/**
 * Scan effective-paths-*.ts for Tab!Cell citations (same rules as the cell-ref pin test).
 * Shared by coverage seeding and trust invariants.
 */
import fs from 'node:fs'
import path from 'node:path'

const HERE = __dirname
const MECHANICS_DIR = path.join(HERE, '..')

/** Tabs from live sheet_info — keep in sync with effective-paths-cell-references.test.ts */
export const EP_SHEET_TABS = [
  'Version History', 'Home Page', 'IDS', 'Giveaways', 'eHP', '_IDS', 'eHP Stone', 'eHP Coins',
  'eRegen', 'eDamage', 'eDamage Stone', 'eDamage Coins', 'eDamage Keys', 'eEcon', 'eEcon Stones',
  'eEcon Discount', 'EP_HELPER', 'Master Sheet', 'Data_Val_Tables', 'DVT_Bot', 'Images', 'All UWs',
  'All Bots', 'Module Base Stat', 'WSValues', 'DVT_Laboratory', 'DVT_Workshop', 'DVT_Guardians',
  'DVT_Laboratory_Unlock', 'DVT_UWs',
] as const

const REFERENCE = new RegExp(
  String.raw`(?<![A-Za-z_])(` + EP_SHEET_TABS.map(tab => tab.replace(/[^\w ]/g, '\\$&')).join('|')
  + String.raw`)!\$?([A-Z]{1,3})\$?(\d{1,4})`,
  'g',
)

export interface EpCellCitation {
  file: string
  tab: string
  cell: string
  key: string
}

export function listEffectivePathsSourceFiles(mechanicsDir = MECHANICS_DIR): string[] {
  return fs.readdirSync(mechanicsDir)
    .filter(name => name.startsWith('effective-paths-') && name.endsWith('.ts'))
    .filter(name => !name.endsWith('.test.ts'))
    .map(name => path.join(mechanicsDir, name))
}

export function collectEpPlannerCellCitations(mechanicsDir = MECHANICS_DIR): EpCellCitation[] {
  const found: EpCellCitation[] = []
  for (const file of listEffectivePathsSourceFiles(mechanicsDir)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const match of source.matchAll(REFERENCE)) {
      const tab = match[1]
      const cell = `${match[2]}${match[3]}`
      found.push({
        file: path.basename(file),
        tab,
        cell,
        key: `${tab}!${cell}`,
      })
    }
  }
  return found
}

export function distinctEpPlannerCellKeys(mechanicsDir = MECHANICS_DIR): string[] {
  return [...new Set(collectEpPlannerCellCitations(mechanicsDir).map(c => c.key))].sort()
}
