const TeleBot = require('telebot')
const moment = require('moment')

let bot = undefined
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN)
} else {
  console.error('Please define the TELEGRAM_BOT_TOKEN environment variable')
  process.exit(1)
}

const sendMessage = async (chatID, data) => {
  let message = _formatAlertMessage(data)
  console.log(`${moment().format()}: send message to ${chatID}\n${message.message}\n`)
  let replyMarkup = bot.inlineKeyboard([
    [
      bot.inlineButton('do something', { callback: '{"txt": "doing something"}' }),
      bot.inlineButton('view prometheus query', { url: message.promLink }),
    ],
  ])
  return await bot.sendMessage(chatID, message.message, { replyMarkup, parseMode: 'markdown' })
}

const _humanizeDuration = function (eventDate) {
  let eventMDuration = moment.duration(moment({}).diff(moment(eventDate)), 'seconds')
  let eventDurationString = ''
  if (eventMDuration.days() > 0) eventDurationString += ' ' + moment.duration(eventMDuration.days(), 'days').humanize()
  if (eventMDuration.hours() > 0) eventDurationString += ' ' + moment.duration(eventMDuration.hours(), 'hours').humanize()
  if (eventMDuration.minutes() > 0) eventDurationString += ' ' + moment.duration(eventMDuration.minutes(), 'minutes').humanize()
  return eventDurationString.trim()
}

const _formatAlertMessage = (data) => {
  let msg = {}
  msg.message = ''
  msg.status = data.status
  msg.startsAt = data.alerts[0].startsAt
  msg.promLink = data.alerts[0].generatorURL
  msg.firingSince = _humanizeDuration(msg.startsAt)

  switch (msg.status) {
    // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥
    case 'firing':
      msg.message += `🔥 Firing 🔥\n\n`
      break
    default:
      msg.message += `🚨 Alerting 🚨\n\n`
      break
  }

  if (['alerts', 'commonAnnotations', 'externalURL'].every((key) => Object.keys(data).includes(key))) {
    msg.message += `Title: _${data.commonAnnotations.summary}_\n\n`
    msg.message += `Description: \`${data.commonAnnotations.description}\`\n\n`
    msg.message += `Firing since ${msg.firingSince}.\n\n`
    msg.message += `📣 [view on prometheus](${msg.promLink}) | [to the alertmanager](${data.externalURL})\n`
  } else {
    throw new Error(`Data send by alertmanager are bad: ${data}`)
  }

  return msg
}

const validateGroupOrChatID = (id) => {
  let re = new RegExp(/^[-]?[\d]{6,9}$/)
  return id.match(re)
}

const manageBotEvents = async () => {
  let meBot = await bot.getMe()
  let botName = meBot.username

  bot.on(/^\/say (.+)$/, (msg, props) => {
    console.log('say')
    const text = props.match[1]
    return bot.sendMessage(msg.chat.id, text, { replyToMessage: msg.message_id })
  })
  bot.on(new RegExp(`^\/start(@${botName})?$`), (msg) => {
    const text = `This bot is a helper for the IDEV-FSD prometheus and alertmanager: it sends alerts to groups and can list some of the alertmanager's info.`
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/help(@${botName})?$`), (msg) => {
    console.log('help')
    const text = `[WIP] /help list available commands.`
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/status(@${botName})?$`), (msg) => {
    console.log('status')
    const text = `[WIP] /status will list the current status.`
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/alerts(@${botName})?$`), (msg) => {
    console.log('alerts')
    const text = `[WIP] /alerts will list the current alerts list. /alert [group] to /alerts/groups.`
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/receivers(@${botName})?$`), (msg) => {
    console.log('receivers')
    const text = `[WIP] /receivers will list the current receivers list.`
    return bot.sendMessage(msg.chat.id, text)
  })
  bot.on(new RegExp(`^\/silences(@${botName})?$`), (msg) => {
    console.log('silences')
    const text = `[WIP] /silences will list the current alerts list. /silence [id] to /silence/{silenceID}.`
    return bot.sendMessage(msg.chat.id, text)
  })
  // Inline button callback
  bot.on('callbackQuery', (msg) => {
    // https://github.com/mullwar/telebot/blob/master/examples/keyboard.js
    bot.answerCallbackQuery(msg.id, `Inline button callback: ${JSON.parse(msg.data).txt}`, true)
    return bot.sendMessage(msg.message.chat.id, `Inline button callback: ${JSON.parse(msg.data).txt}`)
  })

  bot.start()
}
module.exports.sendMessage = sendMessage
module.exports.validateGroupOrChatID = validateGroupOrChatID
module.exports.manageBotEvents = manageBotEvents
