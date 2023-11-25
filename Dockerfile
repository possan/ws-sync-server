FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install

COPY . .

ENV HOST=0.0.0.0
ENV PORT=3000
ENV NODE_ENV=production
ENV VITE_ENV=production

# RUN npm run build

EXPOSE 3000

CMD ["node", "server.js"]
