FROM node:lts-alpine

RUN npm install -g servor

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build
EXPOSE 5173
CMD ["servor", "dist", "index.html", "5173"]