import { buildNormalizerPersistenceSchema } from './local-persistence-types'

export type GuardiansCalcsMainTab = 'Chips' | 'Effective Paths'

export type GuardiansCalcsLocalState = {
  mainTab: GuardiansCalcsMainTab
  activeTab: string
  enteredLevels: Record<string, number[]>
  targetLevels: Record<string, number[]>
  showStatCumulatives: boolean
  hideCompleted: boolean
  statFilter: number[]
  startingPanel: number | undefined
  targetPanel: number | undefined
}

export const defaultGuardiansCalcsLocalState = (): GuardiansCalcsLocalState => ({
  mainTab: 'Chips',
  activeTab: '',
  enteredLevels: {},
  targetLevels: {},
  showStatCumulatives: false,
  hideCompleted: true,
  statFilter: [],
  startingPanel: 0,
  targetPanel: 0,
})

function normalizeNumberArray(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map(item => Number(item))
    .filter(item => Number.isFinite(item))
    .map(item => Math.floor(item))
}

function normalizeLevelsByGuardian(value: unknown): Record<string, number[]> {
  if (!value || typeof value !== 'object') return {}
  const out: Record<string, number[]> = {}
  for (const [guardian, levels] of Object.entries(value as Record<string, unknown>)) {
    if (!guardian) continue
    out[guardian] = normalizeNumberArray(levels)
  }
  return out
}

function normalizeOptionalPanel(value: unknown, fallback: number | undefined): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.floor(value)
  if (value === undefined) return undefined
  return fallback
}

export function normalizeGuardiansCalcsLocalState(
  input: unknown,
  base: GuardiansCalcsLocalState = defaultGuardiansCalcsLocalState(),
): GuardiansCalcsLocalState {
  const data = input && typeof input === 'object' ? input as Record<string, unknown> : {}
  const mainTab = data.mainTab
  const activeTab = data.activeTab

  return {
    mainTab: mainTab === 'Chips' || mainTab === 'Effective Paths' ? mainTab : base.mainTab,
    activeTab: typeof activeTab === 'string' ? activeTab : base.activeTab,
    enteredLevels: normalizeLevelsByGuardian(data.enteredLevels),
    targetLevels: normalizeLevelsByGuardian(data.targetLevels),
    showStatCumulatives: typeof data.showStatCumulatives === 'boolean' ? data.showStatCumulatives : base.showStatCumulatives,
    hideCompleted: typeof data.hideCompleted === 'boolean' ? data.hideCompleted : base.hideCompleted,
    statFilter: normalizeNumberArray(data.statFilter),
    startingPanel: normalizeOptionalPanel(data.startingPanel, base.startingPanel),
    targetPanel: normalizeOptionalPanel(data.targetPanel, base.targetPanel),
  }
}

export const guardiansCalcsLocalPersistenceSchema = buildNormalizerPersistenceSchema(normalizeGuardiansCalcsLocalState)
