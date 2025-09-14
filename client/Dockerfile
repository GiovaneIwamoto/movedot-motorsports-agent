FROM node:20-alpine



COPY package*.json ./
RUN npm install
COPY . .

WORKDIR /client

CMD ["npm", "run", "dev"]
