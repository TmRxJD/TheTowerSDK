import { describe, expect, it } from 'vitest'

import {
  advanceRetryScheduleState,
  applyRetryFailureState,
  buildRetryScheduleState,
  enqueueUniqueItemsByKey,
  getRetryQueueDisposition,
  hasReachedRetryLimit,
  isRetryScheduleReady,
  normalizeRetryAttemptCount,
  parseRetryScheduleState,
  partitionRetryQueueItems,
  replaceOrInsertMatchingItem,
  settleRetryQueueItems,
} from './persistence-primitives'

describe('persistence primitives retry schedule', () => {
  it('creates an immediately-ready retry schedule', () => {
    expect(buildRetryScheduleState(1_000)).toEqual({
      attemptCount: 0,
      nextRetryAt: 1_000,
    })
  })

  it('advances retry schedule with exponential backoff', () => {
    expect(advanceRetryScheduleState({ attemptCount: 0, nowMs: 1_000, baseDelayMs: 100 })).toEqual({
      attemptCount: 1,
      nextRetryAt: 1_200,
    })

    expect(advanceRetryScheduleState({ attemptCount: 2, nowMs: 1_000, baseDelayMs: 100 })).toEqual({
      attemptCount: 3,
      nextRetryAt: 1_800,
    })
  })

  it('treats missing retry timestamps as ready', () => {
    expect(isRetryScheduleReady(undefined, 1_000)).toBe(true)
    expect(isRetryScheduleReady(900, 1_000)).toBe(true)
    expect(isRetryScheduleReady(1_100, 1_000)).toBe(false)
  })

  it('parses persisted retry metadata and enforces retry limits', () => {
    expect(normalizeRetryAttemptCount('3')).toBe(3)
    expect(normalizeRetryAttemptCount(undefined)).toBe(0)
    expect(parseRetryScheduleState({ attemptCount: '2', nextRetryAt: '1500', nowMs: 1_000 })).toEqual({
      attemptCount: 2,
      nextRetryAt: 1_500,
    })
    expect(parseRetryScheduleState({ attemptCount: 'bad', nextRetryAt: 'bad', nowMs: 1_000 })).toEqual({
      attemptCount: 0,
      nextRetryAt: 1_000,
    })
    expect(hasReachedRetryLimit({ attemptCount: 3, maxRetryCount: 3 })).toBe(true)
    expect(hasReachedRetryLimit({ attemptCount: 2, maxRetryCount: 3 })).toBe(false)
  })

  it('classifies and partitions retry queue items through shared helpers', () => {
    expect(getRetryQueueDisposition({ attemptCount: 0, nextRetryAt: 900, nowMs: 1_000 })).toBe('ready')
    expect(getRetryQueueDisposition({ attemptCount: 0, nextRetryAt: 1_100, nowMs: 1_000 })).toBe('deferred')
    expect(getRetryQueueDisposition({ attemptCount: 3, nextRetryAt: 900, nowMs: 1_000, maxRetryCount: 3 })).toBe('exhausted')

    const partition = partitionRetryQueueItems({
      items: [
        { id: 'ready', retryCount: 0, nextRetryAt: 900 },
        { id: 'deferred', retryCount: 0, nextRetryAt: 1_100 },
        { id: 'exhausted', retryCount: 3, nextRetryAt: 900 },
      ],
      getAttemptCount: item => item.retryCount,
      getNextRetryAt: item => item.nextRetryAt,
      nowMs: 1_000,
      maxRetryCount: 3,
    })

    expect(partition.readyItems.map(item => item.id)).toEqual(['ready'])
    expect(partition.deferredItems.map(item => item.id)).toEqual(['deferred'])
    expect(partition.exhaustedItems.map(item => item.id)).toEqual(['exhausted'])
  })

  it('applies retry failure state updates through a shared item mapper', () => {
    const updated = applyRetryFailureState({
      item: { id: 'run-1', attempts: 1, nextRetryAt: 1_000 },
      getAttemptCount: item => item.attempts,
      nowMs: 1_000,
      baseDelayMs: 100,
      updateItem: (item, retryState) => ({
        ...item,
        attempts: retryState.attemptCount,
        nextRetryAt: retryState.nextRetryAt,
      }),
    })

    expect(updated).toEqual({
      id: 'run-1',
      attempts: 2,
      nextRetryAt: 1_400,
    })
  })

  it('settles retry queue batches through one shared helper', async () => {
    const settlement = await settleRetryQueueItems({
      items: [
        { id: 'ready-ok', attempts: 0, nextRetryAt: 900 },
        { id: 'ready-fail', attempts: 1, nextRetryAt: 900 },
        { id: 'deferred', attempts: 0, nextRetryAt: 1_100 },
        { id: 'exhausted', attempts: 3, nextRetryAt: 900 },
      ],
      getKey: item => item.id,
      getAttemptCount: item => item.attempts,
      getNextRetryAt: item => item.nextRetryAt,
      nowMs: 1_000,
      maxRetryCount: 3,
      processReadyItems: async readyItems => readyItems.map(item => ({
        key: item.id,
        status: item.id === 'ready-ok' ? 'succeeded' : 'failed',
        error: item.id === 'ready-fail' ? 'boom' : undefined,
      })),
      updateFailedItem: (item, retryState) => ({
        ...item,
        attempts: retryState.attemptCount,
        nextRetryAt: retryState.nextRetryAt,
      }),
    })

    expect(settlement.succeededItems.map(item => item.id)).toEqual(['ready-ok'])
    expect(settlement.failedItems).toEqual([{ item: { id: 'ready-fail', attempts: 1, nextRetryAt: 900 }, error: 'boom' }])
    expect(settlement.exhaustedItems.map(item => item.id)).toEqual(['exhausted'])
    expect(settlement.nextItems).toEqual([
      { id: 'ready-fail', attempts: 2, nextRetryAt: 9_000 },
      { id: 'deferred', attempts: 0, nextRetryAt: 1_100 },
    ])
  })

  it('enqueues unique items by key without duplicating existing queue entries', () => {
    const result = enqueueUniqueItemsByKey({
      existingItems: [{ id: 'run-1' }, { id: 'run-2' }],
      incomingItems: [{ id: 'run-2' }, { id: 'run-3' }],
      getKey: item => item.id,
    })

    expect(result.changed).toBe(true)
    expect(result.items).toEqual([
      { id: 'run-1' },
      { id: 'run-2' },
      { id: 'run-3' },
    ])
  })

  it('replaces or inserts the first matching queue item through a shared helper', () => {
    const replaced = replaceOrInsertMatchingItem({
      existingItems: [{ id: 'run-1', value: 'old' }, { id: 'run-2', value: 'keep' }],
      matchesExisting: item => item.id === 'run-1',
      buildItem: previousItem => ({ id: previousItem?.id ?? 'new', value: 'new' }),
    })

    expect(replaced.previousItem).toEqual({ id: 'run-1', value: 'old' })
    expect(replaced.changed).toBe(true)
    expect(replaced.items).toEqual([
      { id: 'run-1', value: 'new' },
      { id: 'run-2', value: 'keep' },
    ])

    const inserted = replaceOrInsertMatchingItem({
      existingItems: [{ id: 'run-1', value: 'keep' }],
      matchesExisting: item => item.id === 'run-2',
      buildItem: previousItem => ({ id: previousItem?.id ?? 'run-2', value: 'inserted' }),
    })

    expect(inserted.previousItem).toBeNull()
    expect(inserted.changed).toBe(true)
    expect(inserted.items).toEqual([
      { id: 'run-1', value: 'keep' },
      { id: 'run-2', value: 'inserted' },
    ])
  })
})
