import { MessageBot, Player } from '@bhmb/bot'
import { UIExtensionExports } from '@bhmb/ui'

interface Config {
  time: number
  bans: {[name: string]: number}
}

import html from './tab.html'

MessageBot.registerExtension('bibliofile/tempban', (ex, world) => {
  const defaultConfig: Config = { time: 10, bans: {} }
  const getConfig = () => ex.storage.get('config', defaultConfig)

  function ban(name: string, time = getConfig().time) {
    name = name.toLocaleUpperCase()

    ex.bot.send('/ban ' + name)

    ex.storage.with('config', defaultConfig, config => {
      config.bans[name] = Date.now() + 60000 * time
    })
  }

  function banListener({ player, message }: { player: Player, message: string}) {
    if (!player.isStaff) return
    message = message.toLocaleLowerCase()
    if (!message.startsWith('/temp-ban')) return
    message = message.substr('/temp-ban'.length)

    let { time } = getConfig()
    if (/^-\d+ /.test(message)) { // Custom time `/temp-ban-1 bib`
      const match = message.match(/^-(\d+) (.*)$/)!
      time = +match[1]
      message = match[2]
    } else if (message.startsWith(' ')) { // Default time `/temp-ban bib`
      message = message.substr(1)
    } else { // Invalid
      return
    }

    const target = world.getPlayer(message)
    if (target.isStaff) return

    ban(target.name, time)
  }
  world.onMessage.sub(banListener)

  world.addCommand('clear-temp-blacklist', player => {
    if (!player.isAdmin) return
    ex.storage.with('config', defaultConfig, config => {
      Object.keys(config.bans).forEach(name => {
        ex.bot.send('/unban {{NAME}}', { name })
      })
      config.bans = {}
    })
  })

  let timeout: number
  function unbanChecker() {
    const now = Date.now()
    ex.storage.with('config', defaultConfig, config => {
      Object.keys(config.bans).forEach(name => {
        if (config.bans[name] < now) {
          ex.bot.send('/unban {{NAME}}', { name })
          delete config.bans[name]
        }
      })
    })

    timeout = setTimeout(unbanChecker, 30000)
  }
  unbanChecker()

  ex.remove = () => {
    clearTimeout(timeout)
    world.onMessage.unsub(banListener)
    world.removeCommand('clear-temp-blacklist')
  }

  // Browser only
  const ui = ex.bot.getExports('ui') as UIExtensionExports | undefined
  if (!ui) return

  const tab = ui.addTab('Temporary Bans')
  tab.innerHTML = html

  tab.addEventListener('input', function () {
    ex.storage.with('config', defaultConfig, config => {
      config.time = +tab.querySelector('input')!.value
    })
  })

  ex.remove = (orig => () => {
    orig()
    ui.removeTab(tab)
  })(ex.remove)
})
