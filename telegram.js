const TeleBot = require('telebot')

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

const _formatAlertMessage = (data) => {
  // These emojis could help 🌶🚨❗️📣📢🔔🔕🔥
  let msg = `🔥 Firing 🔥\n\n`

  let status = data.status
  let startsAt = data.startsAt
  let endsAt = data.endsAt

  // console.log(data);
  // console.log(data.alerts);
  // console.log(data.commonLabels);
  // console.log(data.commonAnnotations);

  msg += `Title: _${data.commonAnnotations.summary}_\n\n`
  msg += `Description: \`${data.commonAnnotations.description}\`\n\n`

  // Change the generator URL to the one we can actually access...
  // TODO: obviously, it has to be changed with the `-tst` environment
  if (data.generatorURL) {
    let url = new URL(data.generatorURL)
    url.host = "prometheus.idev-fsd.ml"
    url.port = 80
    url = url.toString()
    msg += `📣 [Link](${url})\n`
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
