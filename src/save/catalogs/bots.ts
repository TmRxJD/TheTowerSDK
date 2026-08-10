import { BOT_IMPORT_CATALOG } from './indexes'

export type BotCatalogRow = (typeof BOT_IMPORT_CATALOG)[number]

export function resolveBotCatalogRow(index: number): BotCatalogRow | null {
  return BOT_IMPORT_CATALOG[index] ?? null
}

export function resolveBotSaveLabel(index: number): string {
  return resolveBotCatalogRow(index)?.label ?? `Bot ${index + 1}`
}

export function listBotCatalogRows(): readonly BotCatalogRow[] {
  return BOT_IMPORT_CATALOG
}
