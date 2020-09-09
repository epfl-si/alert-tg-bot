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
// query example: echo '{ "hello": "World" }' | http POST http://localhost:3000/post
app.post('/*', jsonParser, (req, res) => {
  console.log('url', req.url)
  console.log('query', req.query)
  console.log('body', req.body)
  console.log('headers', req.headers)

  tg.sendMessage()

  res.send('Telegram message was sent!')
})

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`)
})
