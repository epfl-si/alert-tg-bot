# Todo

  - [x] Finish callback button on alert message (do something)
  - [x] Add buttons for `/alerts` same as for `/silences`
  - [x] Finish command `/receivers`
  - [ ] Link to the alert with relevant filter based on the labels
  - [x] Make the logs (and debug mode) great again, possibly with [winston](https://www.npmjs.com/package/winston)
    - [x] Add winston as Express middleware
    - [ ] Add winston as Telebot middleware (https://github.com/mullwar/telebot/issues/185)
    - [x] See how to pass loglevel param to winston
    - [ ] Nice to have: file name as label in winston log (https://github.com/winstonjs/winston/issues/197)
  - [x] Homogenize all bot messages (e.g. `-` vs `•`), Title, spaces, etc.
  - [x] Project's README
  - [ ] Update silence instead of creating a new one
  - [ ] Prometheus' API (like the `/status` for alertmanager)
    - [ ] Is there something that can be done with the prometheus API
  - [ ] Prepare a few slides to introduce a demo (maybe include NOC stuff)
  - [ ] Get ride of momentjs