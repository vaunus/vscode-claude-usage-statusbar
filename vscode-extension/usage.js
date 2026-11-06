// Reads ~/.claude/usage-now.json, written by the usage-statusbar Claude Code mod:
// { five_hour: { used_percentage, resets_at }, seven_day: { ... }, updated_at },
// times in Unix epoch seconds.

// Icons claude-usage-0 to claude-usage-8 from media/usage-dots.woff (built by
// scripts/build_font.py): a braille-style grid with that many dots lit.
const STEPS = 8

const WINDOWS = [
  { key: 'five_hour', label: '5h', title: 'Session' },
  { key: 'seven_day', label: '7d', title: 'Week' },
]

// Each dot is one eighth (12.5%). A dot lights as soon as usage passes into its
// eighth, so 1% shows 1 dot and 13% shows 2.
function bar(percent) {
  const level = Math.min(STEPS, Math.max(0, Math.ceil((percent * STEPS) / 100)))
  return `$(claude-usage-${level})`
}

function parseUsage(text) {
  try {
    const data = JSON.parse(text)
    return data && typeof data === 'object' ? data : undefined
  } catch {
    return undefined
  }
}

function formatTime(seconds) {
  return new Date(seconds * 1000).toLocaleString([], {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Claude Code reports a window only after a reply, so once resets_at passes
// the file still holds the old figure. That window is empty now.
function windowView({ label, title }, window, now) {
  if (!window || typeof window.used_percentage !== 'number') return undefined

  const resetsAt = typeof window.resets_at === 'number' ? window.resets_at : undefined
  const hasReset = resetsAt !== undefined && resetsAt <= now
  const percent = Math.round(hasReset ? 0 : window.used_percentage)

  const lines = [`${title}: ${percent}% used`]
  if (resetsAt !== undefined && !hasReset) lines.push(`Resets: ${formatTime(resetsAt)}`)

  return { text: `${label} ${bar(percent)} ${percent}%`, lines }
}

function usageView(usage, now) {
  if (!usage) return undefined

  const views = WINDOWS.map(window => windowView(window, usage[window.key], now)).filter(Boolean)
  if (views.length === 0) return undefined

  // Markdown: a hard line break within a window, a rule between windows.
  return {
    text: views.map(view => view.text).join(' · '),
    tooltip: views.map(view => view.lines.join('  \n')).join('\n\n---\n\n'),
  }
}

module.exports = { bar, parseUsage, usageView }
