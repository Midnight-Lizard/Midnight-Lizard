FROM node:10
WORKDIR /build
COPY ./package.json .
RUN npm install
COPY . .
ENTRYPOINT npm run prod-pack
