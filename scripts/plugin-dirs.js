// Adds or removes a folder in CLAUDE_CODE_PLUGIN_DIRS, in the env block of
// Claude Code's settings.json. Leaves every other setting as it was.
// Usage: node plugin-dirs.js add|remove <settings.json> <folder>

const fs = require('fs')
const path = require('path')

const [action, file, folder] = process.argv.slice(2)
if (!['add', 'remove'].includes(action) || !file || !folder) {
  console.error('Usage: node plugin-dirs.js add|remove <settings.json> <folder>')
  process.exit(2)
}

let settings = {}
try {
  settings = JSON.parse(fs.readFileSync(file, 'utf8'))
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

const env = settings.env ?? {}
const dirs = (env.CLAUDE_CODE_PLUGIN_DIRS ?? '').split(path.delimiter).filter(Boolean)
const next =
  action === 'add'
    ? dirs.includes(folder) ? dirs : [...dirs, folder]
    : dirs.filter(dir => dir !== folder)

if (next.length === dirs.length) process.exit(0)

if (next.length > 0) env.CLAUDE_CODE_PLUGIN_DIRS = next.join(path.delimiter)
else delete env.CLAUDE_CODE_PLUGIN_DIRS

if (Object.keys(env).length > 0) settings.env = env
else delete settings.env

fs.mkdirSync(path.dirname(file), { recursive: true })
fs.writeFileSync(file, `${JSON.stringify(settings, null, 2)}\n`)
