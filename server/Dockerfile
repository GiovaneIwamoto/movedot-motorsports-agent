# Node LTS é recomendada para estabilidade
FROM node:20-alpine


WORKDIR /server

COPY package*.json ./
RUN npm install
COPY . .


CMD ["node", "server.js"]