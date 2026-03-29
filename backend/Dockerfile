FROM mcr.microsoft.com/playwright:v1.50.0-noble

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/index.js"]
