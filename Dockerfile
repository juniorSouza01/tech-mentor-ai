
FROM node:18

WORKDIR /usr/src/app

RUN apt-get update && apt-get install -y python3 make g++

COPY package.json ./

RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "start"]