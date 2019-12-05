FROM node:13-alpine

ENV NODE_ENV=production

RUN mkdir /app
WORKDIR /app

COPY package.json .

RUN apk add --upgrade --no-cache vips-dev build-base --repository https://alpine.global.ssl.fastly.net/alpine/v3.10/community/

RUN npm config set '@bit:registry' https://node.bit.dev

RUN npm install --production

COPY . .

CMD ["npm", "start"]  # Execute moleculer-runner