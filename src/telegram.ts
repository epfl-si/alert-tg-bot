import moment, { now } from 'moment'
import telebot from 'telebot'
import { getAlertmanagerAPI, deleteAlertmanagerAPI } from './alertmanager'
import javascriptTimeAgo from 'javascript-time-ago'
import en from 'javascript-time-ago/locale/en'

const debugMode = process.env.DEBUG || false
console.log('debugMode', debugMode)
let bot: telebot
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new telebot(process.env.TELEGRAM_BOT_TOKEN)
} else {
  console.error('Please define the TELEGRAM_BOT_TOKEN environment variable')
  process.exit(1)
}

const sendMessage = async (chatID: string, data: any) => {
  const message = formatAlertMessage(data)
  console.log(`${moment().format()}: send message to ${chatID}\n${message['message']}\n`)
  const replyMarkup = bot.inlineKeyboard([
    [
      bot.inlineButton('do something', { callback: '{"txt": "doing something"}' }),
      bot.inlineButton('view prometheus query', { url: message['promLink'] }),
    ],
  ])
  return await bot.sendMessage(chatID, message['message'], { replyMarkup, parseMode: 'markdown' })
}

const humanizeDuration = (eventDate1: Date) => {
  javascriptTimeAgo.addLocale(en)
  const timeAgo = new javascriptTimeAgo('en-US')
  return timeAgo.format(eventDate1.getTime(), 'time')
}

const formatAlertMessage = (data: any) => {
  const msg: any = {}
  msg.message = ''
  msg.status = data.status
  msg.startsAt = data.alerts[0].startsAt
  msg.promLink = data.alerts[0].generatorURL
  msg.firingSince = humanizeDuration(new Date(msg.startsAt))

  switch (msg['status']) {
    // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥🔇🤫
    case 'firing':
      msg.message += '🔥 Firing 🔥\n\n'
      break
    default:
      msg.message += '🚨 Alerting 🚨\n\n'
      break
  }

  const wantedKeys: string[] = ['alerts', 'commonAnnotations', 'externalURL']
  if (
    wantedKeys.every((key) => {
      return Object.keys(data).includes(key)
    })
  ) {
    msg.message += `Title: _${data.commonAnnotations.summary}_\n\n`
    msg.message += `Description: \`${data.commonAnnotations.description}\`\n\n`
    msg.message += `Firing since ${msg.firingSince}. \n\n`
    msg.message += `📣 [view on prometheus](${msg.promLink}) | [to the alertmanager](${data.externalURL})\n`
  } else {
    throw new Error(`Data send by alertmanager are bad: ${data}`)
  }

  return msg
}

const validateGroupOrChatID = (id: string) => {
  const re = new RegExp(/^[-]?[\d]{6,9}$/)
  return id.match(re)
}

const manageBotEvents = async () => {
  const meBot = await bot.getMe()
  const botName = meBot.username

  // logger
  bot.on('text', (msg, props) => {
    const user = `@${msg.from.username}` || `${msg.from.first_name} ${msg.from.last_name}` || msg.from.first_name || msg.from.id
    console.log(`${moment().format()}: ${user} send msg#${msg.message_id} (chat_id: '${msg.chat.id}'): ${msg.text}`)
  })

  bot.on(/^\/say (.+)$/, (msg, props) => {
    const text = props.match[1]
    console.log(`${moment().format()}: ${botName} reply to msg#${msg.message_id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { replyToMessage: msg.message_id })
  })

  bot.on(new RegExp(`^\/start(@${botName})?$`), (msg) => {
    const pjson = require('../package.json')
    const text = `This bot (@${botName}) is a helper for the IDEV-FSD prometheus and alertmanager: it sends alerts to groups and can list some of the alertmanager's info.
Please run /help to see a list of available commands.

\t  • version: \`${pjson.version}\`
\t  • issues: [${pjson.bugs.url}](${pjson.bugs.url})
\t  • readme: [${pjson.homepage}](${pjson.homepage})`
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/help(@${botName})?$`), (msg) => {
    const text = `**${botName}'s commands**:
\t• /start: welcome message, bot information
\t• /help: this help
\t• /status: output the status of the alertmanager
\t• /alerts: lists the current alerts
\t• /silences: lists the current silences
\t• /receivers: lists the available receivers`
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/status(@${botName})?$`), async (msg) => {
    const amStatus: any = await getAlertmanagerAPI('status')
    if (debugMode) console.debug(amStatus.versionInfo)
    let text = '**Alertmanager status**:\n'
    for (const [key, value] of Object.entries(amStatus.versionInfo)) {
      text += `\t  - ${key}: \`${value}\`\n`
    }
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/alerts(@${botName})?$`), async (msg) => {
    const alerts: any = await getAlertmanagerAPI('alerts')
    if (debugMode) console.debug('alerts', alerts)
    let text = '**Alertmanager\'s alerts**:\n\n'
    alerts.forEach((items: any) => {
      text += `‣ ${items.labels.alertname}: ${items.annotations.summary}\n`
      text += `\t  • description: \`${items.annotations.description}\`\n`
      text += `\t  • starts: \`${items.startsAt}\`\n`
      // It seems that tg does not accept URL with prom query in them :/
      // text += `\t  • URL: [generatorURL](${items.generatorURL})\n`
      text += `\t  • job: \`${items.labels.job}\`\n\n`
    })
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/silences(@${botName})?$`), async (msg) => {
    const silences: any = await getAlertmanagerAPI('silences')
    const silenceButtons: any[] = []
    if (debugMode) console.debug(silences)
    let text = '🔇 **Alertmanager\'s silences**🤫:\n\n'
    let activeSilencesNumber: number = 0
    silences.forEach((el: any) => {
      if (el.status.state === 'active') {
        activeSilencesNumber += 1
        // do not list expired silences
        console.log(el.matchers)
        text += `**Silence id: ${el.id}**\n`
        text += `\t  - comment: \`${el.comment}\`\n`
        text += `\t  - createdBy: \`${el.createdBy}\`\n`
        text += `\t  - endsAt: \`${el.endsAt}\`\n`
        text += '\t  - matchers: \n'
        for (const matcher of el.matchers) {
          text += `\t\t  • \`${matcher.name}:${matcher.value}\`\n`
        }
        text += `\t  Silence will end in ${humanizeDuration(new Date(el.endsAt))}.\n\n`
        silenceButtons.push(bot.inlineButton(`Expire: ${el.id.split('-')[0]}`, { callback: `silence_${el.id}` }))
      } else {
        console.log('el: ', el)
      }
    })
    const organizeButtons: any[] = []
    while (silenceButtons.length) {
      organizeButtons.push(silenceButtons.splice(0, 2))
    }
    const replyMarkup = bot.inlineKeyboard(organizeButtons)

    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    if (activeSilencesNumber === 0) {
      text = 'No active silence !'
    }
    return bot.sendMessage(msg.chat.id, text, { replyMarkup, parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/receivers(@${botName})?$`), (msg) => {
    console.log('receivers')
    const text = '[WIP] /receivers will list the current receivers list.'
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text)
  })

  // Inline button callback
  bot.on('callbackQuery', async (msg) => {
    const user = `@${msg.from.username}` || `${msg.from.first_name} ${msg.from.last_name}` || msg.from.first_name || msg.from.id
    if (msg.data.startsWith('silence_')) {
      // we got a silence to expire
      const silenceId: any = msg.data.split('silence_')[1]
      const amSilence: any = await deleteAlertmanagerAPI(`silence/${silenceId}`)
      console.log(amSilence)
      const message: string = (amSilence) ? `Silence ${silenceId} expired` : `Error while expiring silence ${silenceId}`
      bot.sendMessage(msg.message.chat.id, message)
      return bot.answerCallbackQuery(msg.id, { text: message, showAlert: true })
    }
    console.log(msg)
    console.log(`${moment().format()}: ${botName} answerCallbackQuery ${msg.id}.`)
    // https://github.com/mullwar/telebot/blob/master/examples/keyboard.js
    bot.answerCallbackQuery(msg.id, { text: `Inline button callback: ${JSON.parse(msg.data).txt}`, showAlert: true })
    console.log(
      `${moment().format()}: ${botName} sendMessage to ${msg.message.chat.id}: Inline button callback: ${JSON.parse(msg.data).txt}`,
    )
    return bot.sendMessage(msg.message.chat.id, `Inline button callback: ${JSON.parse(msg.data).txt}`)
  })

  bot.start()
}
export { sendMessage, validateGroupOrChatID, manageBotEvents }
