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
      
      let status = req.body.status
      let startsAt = req.body.startsAt
      let endsAt = req.body.endsAt
      
      let url = "https://prometheus.idev-fsd.ml/" + new URL(req.body.generatorURL).path

      console.log("URL: " + url);
      
      console.log(req.body);
      console.log(req.body.alerts);
      console.log(req.body.alerts.annotations);
      console.log(req.body.commonLabels);
      console.log(req.body.commonAnnotations);

      let response = await tg.sendMessage(chatOrGroupID, "test")
      res.send(`Telegram message was sent to ${response.chat.title} [#${chatOrGroupID}]!`)
    } catch (e) {
      res.send(`Error: ${e.description}`)
    }
  } else {
    console.error('Please provide a valid chat or group ID')
    res.send('Please provide a valid chat or group ID')
  }
})

app.listen(port, () => {
  const pjson = require('./package.json');
  console.log(`Example app (version: ${pjson}) listening at http://localhost:${port}`)
})
