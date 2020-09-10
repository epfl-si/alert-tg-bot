const TeleBot = require('telebot')

let bot = undefined
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN)
} else {
  console.error('Please define the TELEGRAM_BOT_TOKEN environment variable')
  process.exit(1)
}

const sendMessage = async (msgChatId) => {
  // const msgChatId = '9917772'
  const msgContent = ' Super MSG !'
  return await bot.sendMessage(msgChatId, msgContent)
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
