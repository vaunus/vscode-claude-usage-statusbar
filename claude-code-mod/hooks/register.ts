import type { EngineInterface, Register, SessionRateLimit } from 'claude-code'

type Window = { used_percentage: number; resets_at?: number }

// The file the VS Code extension reads: one key per window, epoch seconds.
const toText = (rateLimits: readonly SessionRateLimit[], now: number) => {
  const windows: Record<string, Window> = {}
  for (const limit of rateLimits) {
    windows[limit.kind] = {
      used_percentage: limit.percentUsed,
      resets_at: limit.resetsAt ? Math.floor(Date.parse(limit.resetsAt) / 1000) : undefined,
    }
  }
  return JSON.stringify({ ...windows, updated_at: Math.floor(now / 1000) })
}

// $.fs.write rewrites in place, so a reader can catch half a file. Write a temp
// file and mv it over when this host can run commands; write directly when not.
let canMove: Promise<boolean> | undefined

const save = async ($: EngineInterface, rateLimits: readonly SessionRateLimit[]) => {
  const home = await $.env.get('HOME')
  if (!home) return

  const file = `${home}/.claude/usage-now.json`
  const text = toText(rateLimits, await $.clock.now())

  canMove ??= $.process.run(['/usr/bin/true']).then(
    ran => ran.exitCode === 0,
    () => false,
  )

  if (await canMove) {
    const temp = `${file}.${await $.session.id()}.tmp`
    await $.fs.write(temp, text)
    const moved = await $.process.run(['/bin/mv', '-f', temp, file])
    if (moved.exitCode === 0) return
  }

  await $.fs.write(file, text)
}

export const register: Register = on => {
  on('session.measure', async ($, e, next) => {
    const measured = await next(e)
    if (e.changed.includes('rateLimits') && e.rateLimits.length > 0) await save($, e.rateLimits)
    return measured
  })
}
