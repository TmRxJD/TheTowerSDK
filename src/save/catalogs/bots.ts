import { BOT_IMPORT_CATALOG } from './indexes'

export type BotCatalogRow = (typeof BOT_IMPORT_CATALOG)[number]

export function findBotCatalogRow(index: number): BotCatalogRow | null {
  return BOT_IMPORT_CATALOG[index] ?? null
}

export function getBotSaveLabel(index: number): string {
  return findBotCatalogRow(index)?.label ?? `Bot ${index + 1}`
}

export function listBotCatalogRows(): readonly BotCatalogRow[] {
  return BOT_IMPORT_CATALOG
}
