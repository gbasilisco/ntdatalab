FROM node:25
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g @angular/cli 
RUN npm install --legacy-peer-deps
COPY . ./
RUN npm run build
EXPOSE 8080
CMD [ "node", "server.js" ]