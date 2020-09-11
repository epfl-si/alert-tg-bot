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
  return await bot.sendMessage(chatID, message, { parseMode: 'markdown' })
}

const _humanizeDuration = function (eventDate) {
  let eventMDuration = moment.duration(moment({}).diff(moment(eventDate)), 'seconds')
  let eventDurationString = ''
  if (eventMDuration.days() > 0)
    eventDurationString += ' ' + moment.duration(eventMDuration.days(), 'days').humanize()
  if (eventMDuration.hours() > 0)
    eventDurationString += ' ' + moment.duration(eventMDuration.hours(), 'hours').humanize()
  if (eventMDuration.minutes() > 0)
    eventDurationString += ' ' + moment.duration(eventMDuration.minutes(), 'minutes').humanize()
  return eventDurationString.trim()
}

const _formatAlertMessage = (data) => {
  // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥
  let msg = `🔥 Firing 🔥\n\n`

  let status = data.status
  let startsAt = data.alerts[0].startsAt
  let endsAt = data.endsAt

  let firingSince = _humanizeDuration(startsAt)

  if (
    ['alerts', 'commonAnnotations', 'externalURL'].every((key) => Object.keys(data).includes(key))
  ) {
    msg += `Title: _${data.commonAnnotations.summary}_\n\n`
    msg += `Description: \`${data.commonAnnotations.description}\`\n\n`
    msg += `Firing since ${firingSince}.\n`
    msg += `📣 [Link](${data.externalURL})\n`
  } else {
    throw new Error(`Data send by alertmanager are bad: ${data}`)
  }

  return msg
}

const validateGroupOrChatID = (id) => {
  let re = new RegExp(/^[-]?[\d]{6,9}$/)
  return id.match(re)
}

const manageBotEvents = () => {
  bot.on(/^\/say (.+)$/, (msg, props) => {
    console.log('hey2')
    const text = props.match[1]
    return bot.sendMessage(msg.from.id, text, { replyToMessage: msg.message_id })
  })
  bot.start()
}
module.exports.sendMessage = sendMessage
module.exports.validateGroupOrChatID = validateGroupOrChatID
module.exports.manageBotEvents = manageBotEvents
