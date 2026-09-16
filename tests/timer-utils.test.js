import assert from 'node:assert/strict'
import test from 'node:test'

import { addMinutesTarget, formatClockTime, formatRemaining, nextTargetAt } from '../timer-utils.js'

test('formats short and long countdowns', () => {
  assert.equal(formatRemaining(1), '00:01')
  assert.equal(formatRemaining(60_000), '01:00')
  assert.equal(formatRemaining(3_661_000), '01:01:01')
  assert.equal(formatRemaining(-1), '00:00')
})

test('adds quick timer minutes exactly', () => {
  assert.equal(addMinutesTarget(15, 1_000), 901_000)
})

test('formats a timestamp as local clock time', () => {
  const timestamp = new Date(2026, 8, 16, 7, 5).getTime()
  assert.equal(formatClockTime(timestamp), '07:05')
  assert.equal(formatClockTime(null), '')
})

test('uses today for a future exact time', () => {
  const now = new Date(2026, 8, 16, 10, 30).getTime()
  const target = new Date(nextTargetAt(11, 15, now))
  assert.equal(target.getDate(), 16)
  assert.equal(target.getHours(), 11)
  assert.equal(target.getMinutes(), 15)
})

test('uses tomorrow when the exact time has passed', () => {
  const now = new Date(2026, 8, 16, 18, 30).getTime()
  const target = new Date(nextTargetAt(9, 0, now))
  assert.equal(target.getDate(), 17)
  assert.equal(target.getHours(), 9)
})
