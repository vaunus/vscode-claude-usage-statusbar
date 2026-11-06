const fs = require('fs')
const os = require('os')
const path = require('path')
const vscode = require('vscode')
const { parseUsage, usageView } = require('./usage')

const FILE = path.join(os.homedir(), '.claude', 'usage-now.json')

function activate(context) {
  const item = vscode.window.createStatusBarItem('claudeUsageStatusbar.usage', vscode.StatusBarAlignment.Right, 100)
  item.name = 'Claude usage'
  item.color = new vscode.ThemeColor('claudeUsageStatusbar.foreground')
  context.subscriptions.push(item)

  let usage

  const render = () => {
    const view = usageView(usage, Date.now() / 1000)
    if (!view) return item.hide()
    item.text = view.text
    item.tooltip = new vscode.MarkdownString(view.tooltip)
    item.show()
  }

  const load = () => {
    let text
    try {
      text = fs.readFileSync(FILE, 'utf8')
    } catch {
      usage = undefined
      return render()
    }
    // A file that does not parse keeps the last good figures on screen.
    usage = parseUsage(text) ?? usage
    render()
  }

  // watchFile polls the path, so it keeps working when the mod swaps the file in with mv.
  fs.watchFile(FILE, { interval: 1000 }, load)
  const timer = setInterval(render, 30_000)
  context.subscriptions.push({
    dispose: () => {
      fs.unwatchFile(FILE, load)
      clearInterval(timer)
    },
  })

  load()
}

function deactivate() {}

module.exports = { activate, deactivate }
