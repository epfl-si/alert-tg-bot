const express = require('express')
const tg = require('./telegram.js')
const pjson = require('./package.json');
const app = express()
const port = 3000

let bodyParser = require('body-parser')
let jsonParser = bodyParser.json()

// Handle bot events
tg.manageBotEvents()

// GET
app.get('/', (req, res) => {
  res.send('alert-tg-bot')
})

// POST:
// query example: http POST http://localhost:3000/-460587583 < alert.json
app.post('/*', jsonParser, async (req, res) => {
  let chatOrGroupID = req.url.replace(/\//, '')
  if (tg.validateGroupOrChatID(chatOrGroupID)) {
    try {
      let response = await tg.sendMessage(chatOrGroupID, req.body)
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

app.listen(port, () => {
  const pjson = require('./package.json');
  console.log(`Example app (version: ${pjson.version}) listening at http://localhost:${port}`)
})
