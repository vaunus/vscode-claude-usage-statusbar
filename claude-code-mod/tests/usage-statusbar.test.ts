import type { On } from 'claude-code'
import { expect, test } from 'claude-code/testing'

const FILE = '/Users/test/.claude/usage-now.json'

const RATE_LIMITS = [
  { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-11-06T13:59:00.000Z' },
  { kind: 'seven_day', percentUsed: 41, resetsAt: '2026-11-12T05:59:00.000Z' },
]

const EXPECTED = {
  five_hour: { used_percentage: 23.5, resets_at: 1793973540 },
  seven_day: { used_percentage: 41, resets_at: 1794463140 },
  updated_at: 1793970000,
}

// Nothing sits beneath the plugin: each hook here stands for the engine.
const engine = (on: On, runs: boolean) => {
  const writes: { path: string; text: string }[] = []
  const commands: (readonly string[])[] = []

  on('env.get', () => ({ value: '/Users/test' }))
  on('clock.now', () => ({ value: 1793970000_000 }))
  on('session.id', () => ({ value: 'abc' }))
  on('session.measure', (_, e) => ({ changed: e.changed }))
  on('fs.write', (_, e) => (writes.push({ path: e.path, text: e.text }), { value: undefined }))
  on('process.run', (_, e) => {
    if (!runs) throw new Error('no processes here')
    commands.push(e.argv)
    return { value: { exitCode: 0, stdout: '', stderr: '', isStdoutTruncated: false, isStderrTruncated: false } }
  })

  return { writes, commands }
}

const measure = { context: { window: 200000 }, rateLimits: RATE_LIMITS, changed: ['rateLimits'] as const }

test('writes a temp file and moves it over the usage file', async ($, on) => {
  const { writes, commands } = engine(on, true)

  await $.session.measure({ ...measure, changed: [...measure.changed] })

  expect(writes.length).toBe(1)
  expect(writes[0]?.path).toBe(`${FILE}.abc.tmp`)
  expect(JSON.parse(writes[0]?.text ?? '')).toEqual(EXPECTED)
  expect(commands.at(-1)).toEqual(['/bin/mv', '-f', `${FILE}.abc.tmp`, FILE])
})

test('writes the usage file directly where commands cannot run', async ($, on) => {
  const { writes } = engine(on, false)

  await $.session.measure({ ...measure, changed: [...measure.changed] })

  expect(writes.length).toBe(1)
  expect(writes[0]?.path).toBe(FILE)
  expect(JSON.parse(writes[0]?.text ?? '')).toEqual(EXPECTED)
})

test('writes nothing when the limits did not move or are unknown', async ($, on) => {
  const { writes } = engine(on, true)

  await $.session.measure({ ...measure, changed: ['context'] })
  await $.session.measure({ ...measure, rateLimits: [], changed: ['rateLimits'] })

  expect(writes.length).toBe(0)
})
