FROM node:14-alpine
WORKDIR /usr/src/event-reminder/server
COPY ./server/package*.json ./
RUN npm i
WORKDIR /usr/src/event-reminder
COPY . .
WORKDIR /usr/src/event-reminder/server
EXPOSE 3000
CMD ["npm", "start"]