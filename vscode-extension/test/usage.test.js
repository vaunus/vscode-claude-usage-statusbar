const assert = require('node:assert/strict')
const { test } = require('node:test')
const { bar, parseUsage, usageView } = require('../usage')

const NOW = 1793970000

test('bar lights one dot per eighth and stays in range', () => {
  assert.equal(bar(0), '$(claude-usage-0)')
  assert.equal(bar(12.5), '$(claude-usage-1)')
  assert.equal(bar(50), '$(claude-usage-4)')
  assert.equal(bar(87.5), '$(claude-usage-7)')
  assert.equal(bar(100), '$(claude-usage-8)')
  assert.equal(bar(140), '$(claude-usage-8)')
  assert.equal(bar(-5), '$(claude-usage-0)')
})

test('parseUsage refuses a half-written or empty file', () => {
  assert.equal(parseUsage(''), undefined)
  assert.equal(parseUsage('{"five_hour":{"used_perc'), undefined)
  assert.equal(parseUsage('null'), undefined)
  assert.deepEqual(parseUsage('{"five_hour":{"used_percentage":4}}'), { five_hour: { used_percentage: 4 } })
})

test('usageView puts both windows in one item, split by a dot', () => {
  const view = usageView(
    {
      five_hour: { used_percentage: 23.5, resets_at: NOW + 3600 },
      seven_day: { used_percentage: 61, resets_at: NOW + 86400 },
      updated_at: NOW - 60,
    },
    NOW,
  )

  assert.equal(view.text, '5h $(claude-usage-2) 24% · 7d $(claude-usage-5) 61%')
  assert.match(view.tooltip, /^Session: 24% used {2}\nResets: .+\n\n---\n\nWeek: 61% used {2}\nResets: .+$/)
})

test('usageView shows an empty window once the reset time passes', () => {
  const view = usageView(
    {
      five_hour: { used_percentage: 88, resets_at: NOW - 1 },
      seven_day: { used_percentage: 40, resets_at: NOW + 86400 },
    },
    NOW,
  )

  assert.equal(view.text, '5h $(claude-usage-0) 0% · 7d $(claude-usage-3) 40%')
  assert.match(view.tooltip, /^Session: 0% used\n\n---\n\nWeek: 40% used {2}\nResets: .+$/)
})

test('usageView leaves out a window the file does not have', () => {
  assert.equal(usageView({ seven_day: { used_percentage: 10 } }, NOW).text, '7d $(claude-usage-1) 10%')
  assert.equal(usageView({ five_hour: { resets_at: NOW + 60 } }, NOW), undefined)
  assert.equal(usageView(undefined, NOW), undefined)
})
