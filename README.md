# alert-tg-bot

A telegram bot that receive webhook from an alertmanager and send them to
relevant chat id.


## How to use it

### Part 1: alertmanager

First you'll need to configure your alertmanager with a new receiver that sends
a webhook to `epflsi/alert-tg-bot`:
```
- name: 'alert-tg-bot'
  webhook_configs:
  - send_resolved: true
    url: 'http://alert-tg-bot:3000/-12345678'
```
where `-12345678` is the chat ID that you want to use with the bot. 
Note that you can talk with [@get_id_bot](https://t.me/get_id_bot) to have your chat id.

### Part 2: `epflsi/alert-tg-bot` container

There is a few environment variables that have to be set in order to run the 
`epflsi/alert-tg-bot` container:

| env                  | description                                                               |
| -------------------- | ------------------------------------------------------------------------- |
| `DEBUG`              | Activate the debug mode                                                   |
| `TELEGRAM_BOT_TOKEN` | The TOKEN of your bot                                                     |
| `AM_URL`             | URL of the alertmanager without trailing /, e.g. <https://am.idev-fsd.ml> |
| `AM_BASIC_AUTH_USER` | This assume that your alertmanager has a basic authentification system    |
| `AM_BASIC_AUTH_PASS` | This assume that your alertmanager has a basic authentification system    |


In short, you will have to run the `epflsi/alert-tg-bot` container with a
command simmilar to:
```
docker run -d --rm                                   \
           --name alert-tg-bot                       \
           -e DEBUG=false                            \
           -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN \
           -e AM_URL=$AM_URL                         \
           -e AM_BASIC_AUTH_USER=$AM_BASIC_AUTH_USER \
           -e AM_BASIC_AUTH_PASS=$AM_BASIC_AUTH_PASS \
           -p 3000:3000                              \
       epflsi/alert-tg-bot
```

### Part 3: the bot

Last but not least, your bot has to be present in all chat that have their
chat_id linked to an alertmanager receivers. If not, the alertmanager won't be
able to send message and interact with the bot.


## Development

The list of commands that can be used in a development cycle are put in the
[Makefile](./Makefile), just run `make` to get the available rules in
alphabetical order:

| target         | description                                                                                               |
| -------------- | --------------------------------------------------------------------------------------------------------- |
| `docker-build` | Build the Docker container ${ORG_NAME}/${IMAGE_NAME}                                                      |
| `docker-exec`  | Enter the ${IMAGE_NAME} container                                                                         |
| `docker-logs`  | Display and follow the logs of ${IMAGE_NAME}                                                              |
| `docker-push`  | Push both laster and package.json version to dockerhub                                                    |
| `docker-rm`    | Remove ${IMAGE_NAME} image                                                                                |
| `docker-run`   | Run the Docker container with relevant environment variables                                              |
| `docker-tag`   | docker- the Docker image with latest and the version in package.json                                      |
| `http-post`    | Issue a POST request to the express app based on content of alert.json                                    |
| `npm-ci`       | Install node_module in a clean state (see <https://docs.npmjs.com/cli/ci.html>)                           |
| `ts-lint`      | Run TSLint (see https://palantir.github.io/tslint/)                                                       |
| `ts-transpile` | Transpile the TypeScript files (see <https://www.typescriptlang.org/docs/handbook/compiler-options.html>) |
| `_dev`         | Brings up the Docker environment and send a test request                                                  |
| `_help`        | Print this help (see <https://gist.github.com/klmr/575726c7e05d8780505a> for explanation)                 |
| `_release`     | Build, tag and publish the Docker image                                                                   |


## Help and issues

Although this code is [provided as is](./LICENSE), we would be happy to provide
assistance and to answer your questions where possible. Feel free to open an
[issue](https://github.com/epfl-si/alert-tg-bot/issues/new/choose).
