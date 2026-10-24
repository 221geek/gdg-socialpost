FROM node:22-alpine
RUN apk add --no-cache curl
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
RUN mkdir -p /data/uploads
EXPOSE 4000
CMD ["npm", "start"]
