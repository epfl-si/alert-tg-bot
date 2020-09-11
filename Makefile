SHELL := /bin/bash

ORG_NAME=epflsi
IMAGE_NAME=alert-tg-bot
TG_GROUP_ID=-460587583


.PHONY: dev
dev:
	$(MAKE) rm build run post logs

.PHONY: release
release:
	$(MAKE) rm build tag push

.PHONY: rm
rm:
	docker rm -f ${IMAGE_NAME} || true

.PHONY: build
build:
	docker build -t ${ORG_NAME}/${IMAGE_NAME} .

.PHONY: run
run:
	docker run -d --rm \
		-e DEBUG=true \
		-e TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN} \
		-e AM_BASIC_AUTH_USER=${AM_BASIC_AUTH_USER} \
		-e AM_BASIC_AUTH_PASS=${AM_BASIC_AUTH_PASS} \
		-p 3000:3000 \
		--name ${IMAGE_NAME} \
		${ORG_NAME}/${IMAGE_NAME}

.PHONY: logs
logs:
	docker logs -f ${IMAGE_NAME}

.PHONY: post
post:
	http POST http://localhost:3000/${TG_GROUP_ID} < alert.json

.PHONY: tag
tag:
	docker tag ${ORG_NAME}/${IMAGE_NAME}:latest ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)

.PHONY: push
push:
	docker push ${ORG_NAME}/${IMAGE_NAME}:latest; docker push ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)
