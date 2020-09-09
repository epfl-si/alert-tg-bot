const TeleBot = require('telebot')

let bot = undefined
if (process.env.TELEGRAM_BOT_TOKEN) {
  bot = new TeleBot(process.env.TELEGRAM_BOT_TOKEN)
} else {
  console.error("Please define the TELEGRAM_BOT_TOKEN environment variable")
  process.exit(1)
}

const sendMessage = () => {
  const msgChatId = "9917772"
  const msgContent = " Super MSG !"
  bot.sendMessage(msgChatId, msgContent)
}

module.exports.sendMessage = sendMessage
