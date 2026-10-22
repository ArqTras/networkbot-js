FROM node:20-alpine
WORKDIR /app
COPY .env .
COPY package*.json ./
RUN npm ci --omit=dev || npm i
COPY . .
ENV NODE_ENV=production
EXPOSE 8899
CMD ["node","start.js"]
