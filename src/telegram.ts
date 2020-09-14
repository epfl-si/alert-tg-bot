import moment from 'moment'
import telebot from 'telebot'
import { getAlertmanagerAPI, postAlertmanagerAPI, postTestAlert } from './alertmanager'
const debugMode = process.env.DEBUG || false

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

const humanizeDuration = (eventDate: string) => {
  const eventDuration = moment.duration(moment({}).diff(moment(eventDate)), 'seconds')
  let eventDurationString = ''
  if (eventDuration.days() > 0) eventDurationString += ` ${moment.duration(eventDuration.days(), 'days').humanize()}`
  if (eventDuration.hours() > 0) eventDurationString += ` ${moment.duration(eventDuration.hours(), 'hours').humanize()}`
  if (eventDuration.minutes() > 0) eventDurationString += ` ${moment.duration(eventDuration.minutes(), 'minutes').humanize()}`
  return eventDurationString.trim()
}

const formatAlertMessage = (data: any) => {
  const msg: any = {}
  msg.message = ''
  msg.status = data.status
  msg.startsAt = data.alerts[0].startsAt
  msg.promLink = data.alerts[0].generatorURL
  msg.firingSince = humanizeDuration(msg.startsAt)

  switch (msg['status']) {
    // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥
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
    let user = `@${msg.from.username}` || `${msg.from.first_name} ${msg.from.last_name}` || msg.from.first_name || msg.from.id
    console.log(`${moment().format()}: ${user} send msg#${msg.message_id} (chat_id: '${msg.chat.id}'): ${msg.text}`)
  })

  bot.on(/^\/say (.+)$/, (msg, props) => {
    const text = props.match[1]
    console.log(`${moment().format()}: ${botName} reply to msg#${msg.message_id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { replyToMessage: msg.message_id })
  })

  bot.on(new RegExp(`^\/start(@${botName})?$`), (msg) => {
    const text =
      "This bot is a helper for the IDEV-FSD prometheus and alertmanager: it sends alerts to groups and can list some of the alertmanager's info."
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text)
  })

  bot.on(new RegExp(`^\/help(@${botName})?$`), (msg) => {
    const text = '[WIP] /help list available commands.'
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text)
  })

  bot.on(new RegExp(`^\/status(@${botName})?$`), async (msg) => {
    const amStatus = await getAlertmanagerAPI('status')
    if (debugMode) console.debug(amStatus.versionInfo)
    let text = '**Alertmanager infos**\n'
    for (const [key, value] of Object.entries(amStatus.versionInfo)) {
      text += `\t  - ${key}: \`${value}\`\n`
    }
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text, { parseMode: 'markdown' })
  })

  bot.on(new RegExp(`^\/alerts(@${botName})?$`), async (msg) => {
    const alerts = await getAlertmanagerAPI('alerts')
    if (debugMode) console.debug(alerts)
    let text = '**Alertmanager infos**\n\n'
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

  bot.on(new RegExp(`^\/receivers(@${botName})?$`), (msg) => {
    console.log('receivers')
    const text = '[WIP] /receivers will list the current receivers list.'
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/silences(@${botName})?$`), (msg) => {
    console.log('silences')
    const text = '[WIP] /silences will list the current alerts list. /silence [id] to /silence/{silenceID}.'
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.chat.id}: ${text}`)
    return bot.sendMessage(msg.chat.id, text)
  })
  // Inline button callback
  bot.on('callbackQuery', (msg) => {
    console.log(`${moment().format()}: ${botName} answerCallbackQuery ${msg.id}.`)
    // https://github.com/mullwar/telebot/blob/master/examples/keyboard.js
    bot.answerCallbackQuery(msg.id, { text: `Inline button callback: ${JSON.parse(msg.data).txt}`, showAlert: true })
    console.log(`${moment().format()}: ${botName} sendMessage to ${msg.message.chat.id}: Inline button callback: ${JSON.parse(msg.data).txt}`)
    return bot.sendMessage(msg.message.chat.id, `Inline button callback: ${JSON.parse(msg.data).txt}`)
  })

  bot.start()
}
export { sendMessage, validateGroupOrChatID, manageBotEvents }
