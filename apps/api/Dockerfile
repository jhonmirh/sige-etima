FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm install
COPY . .
RUN npm run prisma:generate -w @sige/api && npm run build -w @sige/api
EXPOSE 4000
CMD ["sh", "-c", "cd apps/api && npx prisma db push && npm run prisma:seed && node dist/main.js"]
