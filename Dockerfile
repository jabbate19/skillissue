FROM node:18.13.0
WORKDIR /app

COPY . .

RUN npm install

RUN chmod -R 777 /app

ENTRYPOINT ["npm", "start"]

