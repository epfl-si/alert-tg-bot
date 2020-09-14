SHELL := /bin/bash

ORG_NAME=epflsi
IMAGE_NAME=alert-tg-bot
TG_GROUP_ID=-460587583


.PHONY: dev
dev:
	$(MAKE) rm ts-lint ts-transpile docker-build docker-run http-post docker-logs

.PHONY: release
release:
	$(MAKE) rm build tag push

.PHONY: rm
rm:
	docker rm -f ${IMAGE_NAME} || true

.PHONY: ts-transpile
ts-transpile:
	rm -rf dist/* && tsc

.PHONY: ts-lint
ts-lint:
	npx tslint --fix src/*.ts --project tsconfig.json

.PHONY: docker-build
docker-build:
	docker build -t ${ORG_NAME}/${IMAGE_NAME} .

.PHONY: docker-run
docker-run:
	docker run -d --rm \
		-e DEBUG=true \
		-e TELEGRAM_BOT_TOKEN=${TELEGRAM_BOT_TOKEN} \
		-e AM_BASIC_AUTH_USER=${AM_BASIC_AUTH_USER} \
		-e AM_BASIC_AUTH_PASS=${AM_BASIC_AUTH_PASS} \
		-p 3000:3000 \
		--name ${IMAGE_NAME} \
		${ORG_NAME}/${IMAGE_NAME}

.PHONY: docker-logs
docker-logs:
	docker logs -f ${IMAGE_NAME}

.PHONY: http-post
http-post:
	http POST http://localhost:3000/${TG_GROUP_ID} < alert.json

.PHONY: tag
tag:
	docker tag ${ORG_NAME}/${IMAGE_NAME}:latest ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)

.PHONY: push
push:
	docker push ${ORG_NAME}/${IMAGE_NAME}:latest; docker push ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)
