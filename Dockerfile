FROM node:16-bullseye-slim

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install --production && npm cache clean --force
COPY . .
ENV NODE_ENV production
ENV PORT 80
EXPOSE 80

CMD [ "node", "app.js" ]