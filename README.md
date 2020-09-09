# alert-tg-bot

A telegram bot that receive webhook from an alertmanager and send them to
relevant chat id.

## Dockerfile

List a commands that can be used in a development cycle:

  * Remove existing image:  
    `docker rm -f alert-tg-bot`
  * Build image:  
    `docker build -t epflsi/alert-tg-bot .`
  * Run image:  
    `docker run -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN -p 3000:3000 --name alert-tg-bot epflsi/alert-tg-bot`
  * Check the logs:  
    `docker logs -f alert-tg-bot`
  * Send a request:  
    `http POST localhost:3000/chat-id`
  * Tag image:  
    `docker tag epflsi/alert-tg-bot:latest epflsi/alert-tg-bot:v$(jq -r ".version" package.json)`
  * Push image:  
    `docker push epflsi/alert-tg-bot:latest; docker push epflsi/alert-tg-bot:v$(jq -r ".version" package.json)`
  * Run image:  
```
docker run -d --rm \
           --name alert-tg-bot \
           -e TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN \
           -p 3000:3000 \
           epflsi/alert-tg-bot
```
