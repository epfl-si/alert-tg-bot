import express from 'express'
import { Telegram } from './telegram'
import { validateGroupOrChatID } from './utils'
import bodyParser from 'body-parser'
const app: express.Application = express()
const port: number = 3000
const jsonParser = bodyParser.json()
const debugMode: string | boolean = process.env.DEBUG || false

const telegram = new Telegram()

// Handle bot events, with telebot
telegram.manageBotEvents()

// Express app handles GET requests
app.get('/', (req: any, res: any): void => {
  res.send('alert-tg-bot')
})

// Express app handles POST requests
app.post('/*', jsonParser, async (req: any, res: any) => {
  const chatOrGroupID = req.url.replace(/\//, '')
  if (debugMode) console.dir(req.body, { depth: null })
  if (validateGroupOrChatID(chatOrGroupID)) {
    try {
      const response = await telegram.sendAlertMessage(chatOrGroupID, req.body)
      res.send(`Telegram message was sent to ${response.chat.title} [#${chatOrGroupID}]!`)
    } catch (e) {
      console.error(e)
      res.send(`Error: ${e.description}`)
    }
  } else {
    console.error('Please provide a valid chat or group ID')
    res.send('Please provide a valid chat or group ID')
  }
})

// Launch express app on specified port
app.listen(port, () => {
  const pjson = require('../package.json')
  console.log(`Example app (version: ${pjson.version}) listening at http://localhost:${port}`)
})
