FROM node:18-alpine
EXPOSE 80
EXPOSE 8000



  
WORKDIR /usr/app

COPY package*.json ./
RUN npm install sequelize-cli -g
RUN npm install pm2 -g

COPY . .
RUN npm cache clean --force && rm -rf node_modules && npm install

CMD [ "node", "server.js" ]
