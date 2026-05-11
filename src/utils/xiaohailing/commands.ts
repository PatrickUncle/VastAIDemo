/**
 * 快捷指令面板 - 支持 i18n
 */

interface CommandItem {
  cmd: string
  descKey: string
  fill?: boolean
}

interface CommandGroup {
  titleKey: string
  commands: CommandItem[]
}

function getCommandGroups(): CommandGroup[] {
  return [
    {
      titleKey: 'cmd.model',
      commands: [
        { cmd: '/model', descKey: 'cmd.model.switch', fill: true },
        { cmd: '/model list', descKey: 'cmd.model.list' },
        { cmd: '/model status', descKey: 'cmd.model.status' },
      ],
    },
    {
      titleKey: 'cmd.session',
      commands: [
        { cmd: '/new', descKey: 'cmd.session.new' },
        { cmd: '/reset', descKey: 'cmd.session.reset' },
        { cmd: '/compact', descKey: 'cmd.session.compact' },
        { cmd: '/stop', descKey: 'cmd.session.stop' },
      ],
    },
    {
      titleKey: 'cmd.think',
      commands: [
        { cmd: '/think off', descKey: 'cmd.think.off' },
        { cmd: '/think low', descKey: 'cmd.think.low' },
        { cmd: '/think medium', descKey: 'cmd.think.medium' },
        { cmd: '/think high', descKey: 'cmd.think.high' },
      ],
    },
    {
      titleKey: 'cmd.info',
      commands: [
        { cmd: '/help', descKey: 'cmd.info.help' },
        { cmd: '/status', descKey: 'cmd.info.status' },
        { cmd: '/whoami', descKey: 'cmd.info.whoami' },
        { cmd: '/commands', descKey: 'cmd.info.commands' },
        { cmd: '/context', descKey: 'cmd.info.context' },
      ],
    },
    {
      titleKey: 'cmd.skill',
      commands: [
        { cmd: '/skill ', descKey: 'cmd.skill.run', fill: true },
      ],
    },
    {
      titleKey: 'cmd.advanced',
      commands: [
        { cmd: '/verbose on', descKey: 'cmd.advanced.verbose.on' },
        { cmd: '/verbose off', descKey: 'cmd.advanced.verbose.off' },
        { cmd: '/compact ', descKey: 'cmd.advanced.compact', fill: true },
      ],
    },
  ]
}

let _overlay: HTMLElement | null = null
let _panel: HTMLElement | null = null
let _onSelect: ((cmd: string, fillOnly: boolean) => void) | null = null

export function initCommands(onSelect: (cmd: string, fillOnly: boolean) => void): void {
  _onSelect = onSelect
}

function _buildPanel(): void {
  _overlay?.remove()
  _panel?.remove()

  _overlay = document.createElement('div')
  _overlay.className = 'xh-cmd-overlay'
  _overlay.onclick = hideCommands

  _panel = document.createElement('div')
  _panel.className = 'xh-cmd-panel'

  const header = document.createElement('div')
  header.className = 'xh-cmd-panel-header'
  header.innerHTML = `
    <h3>快捷指令</h3>
    <button class="xh-close-btn">×</button>
  `
  header.querySelector('.xh-close-btn')?.addEventListener('click', hideCommands)

  const list = document.createElement('div')
  list.className = 'xh-cmd-list'

  getCommandGroups().forEach(group => {
    const title = document.createElement('div')
    title.className = 'xh-cmd-group-title'
    title.textContent = group.titleKey.replace('cmd.', '')
    list.appendChild(title)

    group.commands.forEach(({ cmd, descKey, fill }) => {
      const item = document.createElement('div')
      item.className = 'xh-cmd-item'
      item.innerHTML = `
        <span class="xh-cmd-text">${cmd}</span>
        <span class="xh-cmd-desc">${descKey}</span>
      `
      item.addEventListener('click', () => {
        hideCommands()
        if (fill) _onSelect?.(cmd + ' ', true)
        else _onSelect?.(cmd, false)
      })
      list.appendChild(item)
    })
  })

  _panel.appendChild(header)
  _panel.appendChild(list)
  document.body.appendChild(_overlay)
  document.body.appendChild(_panel)
}

export function showCommands(): void {
  _buildPanel()
  _overlay?.classList.add('visible')
  _panel?.classList.add('visible')
}

export function hideCommands(): void {
  _overlay?.classList.remove('visible')
  _panel?.classList.remove('visible')
}

export function isCommandsVisible(): boolean {
  return _panel?.classList.contains('visible') ?? false
}
