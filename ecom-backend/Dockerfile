FROM node:20-alpine
WORKDIR /app

COPY package.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY . .
EXPOSE 4000
CMD ["sh", "-c", "npx tsx src/seed.ts && npx tsx src/index.ts"]
