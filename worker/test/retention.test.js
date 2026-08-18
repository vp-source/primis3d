import assert from 'node:assert/strict'
import test from 'node:test'
import { retentionCutoffs } from '../src/retention.js'

test('retention cutoffs cover seven days, 24 calendar months, and one day', () => {
  const now = Date.parse('2026-08-18T12:30:00.000Z')
  const cutoffs = retentionCutoffs(now)

  assert.equal(cutoffs.pendingCutoff, '2026-08-11T12:30:00.000Z')
  assert.equal(cutoffs.confirmedCutoff, '2024-08-18T12:30:00.000Z')
  assert.equal(cutoffs.rateCutoff, Math.floor(Date.parse('2026-08-17T12:30:00.000Z') / 1000))
})
