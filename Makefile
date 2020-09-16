SHELL := /bin/bash

ORG_NAME=epflsi
IMAGE_NAME=alert-tg-bot
TG_GROUP_ID=-460587583

.PHONY: _help
## Print this help (see <https://gist.github.com/klmr/575726c7e05d8780505a> for explanation)
_help:
	@echo "$$(tput bold)Available rules (alphabetical order):$$(tput sgr0)";sed -ne"/^## /{h;s/.*//;:d" -e"H;n;s/^## //;td" -e"s/:.*//;G;s/\\n## /---/;s/\\n/ /g;p;}" ${MAKEFILE_LIST}|LC_ALL='C' sort -f |awk -F --- -v n=$$(tput cols) -v i=20 -v a="$$(tput setaf 6)" -v z="$$(tput sgr0)" '{printf"%s%*s%s ",a,-i,$$1,z;m=split($$2,w," ");l=n-i;for(j=1;j<=m;j++){l-=length(w[j])+1;if(l<= 0){l=n-i-length(w[j])-1;printf"\n%*s ",-i," ";}printf"%s ",w[j];}printf"\n";}'

.PHONY: _dev
## Brings up the Docker environment and send a test request
_dev:
	$(MAKE) docker-rm npm-ci ts-lint ts-transpile docker-build docker-run http-post docker-logs

.PHONY: _release
## Build, tag and publish the Docker image
_release:
	$(MAKE) docker-rm docker-build docker-tag docker-push

.PHONY: docker-rm
## Remove ${IMAGE_NAME} image 
docker-rm:
	docker rm -f ${IMAGE_NAME} || true

.PHONY: npm-ci
## Install node_module in a clean state (see <https://docs.npmjs.com/cli/ci.html>)
npm-ci:
	npm ci

.PHONY: ts-lint
## Run TSLint (see https://palantir.github.io/tslint/)
ts-lint:
	npx tslint --fix src/*.ts --project tsconfig.json -c tslint.json

.PHONY: ts-transpile
## Transpile the TypeScript files (see <https://www.typescriptlang.org/docs/handbook/compiler-options.html>)
ts-transpile:
	rm -rf dist/* && tsc

.PHONY: docker-build
## Build the Docker container ${ORG_NAME}/${IMAGE_NAME}
docker-build:
	docker build -t ${ORG_NAME}/${IMAGE_NAME} .

.PHONY: docker-run
## Run the Docker container with relevant environment variables
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
## Display and follow the logs of ${IMAGE_NAME}
docker-logs:
	docker logs -f ${IMAGE_NAME}

.PHONY: docker-exec
## Enter the ${IMAGE_NAME} container
docker-exec:
	docker exec -it ${IMAGE_NAME} sh

.PHONY: http-post
## Issue a POST request to the express app based on content of alert.json
http-post:
	sleep 2
	http POST http://localhost:3000/${TG_GROUP_ID} < alert.json

.PHONY: docker-tag
## docker- the Docker image with latest and the version in package.json
docker-tag:
	docker tag ${ORG_NAME}/${IMAGE_NAME}:latest ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)

.PHONY: docker-push
## Push both laster and package.json version to dockerhub
docker-push:
	docker push ${ORG_NAME}/${IMAGE_NAME}:latest; docker push ${ORG_NAME}/${IMAGE_NAME}:v$$(jq -r ".version" package.json)
