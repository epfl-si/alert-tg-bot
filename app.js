const express = require('express')
const tg = require('./telegram.js')

const app = express()
const port = 3000

let bodyParser = require('body-parser')
let jsonParser = bodyParser.json()

// GET
app.get('/', (req, res) => {
  res.send('alert-tg-bot')
})

// POST:
// query example: echo '{ "hello": "World" }' | http POST http://localhost:3000/-460587583
app.post('/*', jsonParser, (req, res) => {
  console.log('url', req.url)
  console.log('query', req.query)
  console.log('body', req.body)
  console.log('headers', req.headers)

  let chatOrGroupID = req.url.replace(/\//, '')
  if (tg.validateGroupOrChatID(chatOrGroupID)) {
    tg.sendMessage(chatOrGroupID)
    res.send(`Telegram message was sent to ${chatOrGroupID}!`)
  } else {
    console.error('Please provide a valid chat or group ID')
    res.send('Please provide a valid chat or group ID')
  }
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
