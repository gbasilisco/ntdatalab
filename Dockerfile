FROM node:25
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install -g @angular/cli 
RUN npm install --legacy-peer-deps
COPY . ./

# CREA environment.ts dinamicamente
RUN mkdir -p src/environments && \
    echo "export const environment = { production: false, firebase: { apiKey: 'dummy', authDomain: 'dummy', projectId: 'dummy', appId: 'dummy', messagingSenderId: 'dummy' } };" > src/environments/environment.ts


ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_APP_ID
ARG FIREBASE_MESSAGING_SENDER_ID

RUN sed -i "s|__FIREBASE_API_KEY__|$FIREBASE_API_KEY|g" src/environments/environment.prod.ts && \
    sed -i "s|__FIREBASE_AUTH_DOMAIN__|$FIREBASE_AUTH_DOMAIN|g" src/environments/environment.prod.ts && \
    sed -i "s|__FIREBASE_PROJECT_ID__|$FIREBASE_PROJECT_ID|g" src/environments/environment.prod.ts && \
    sed -i "s|__FIREBASE_APP_ID__|$FIREBASE_APP_ID|g" src/environments/environment.prod.ts && \
    sed -i "s|__FIREBASE_MESSAGING_SENDER_ID__|$FIREBASE_MESSAGING_SENDER_ID|g" src/environments/environment.prod.ts

RUN npm run build -- --configuration production
EXPOSE 8080
CMD [ "node", "server.js" ]