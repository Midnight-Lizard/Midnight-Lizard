FROM node:10
WORKDIR /build/app
COPY ./package.json .
RUN npm install
COPY . .
RUN npm run prod-pack
