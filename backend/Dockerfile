FROM node:20-alpine

WORKDIR /app

# Install openssl for prisma
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm install

COPY prisma ./prisma/
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src/

EXPOSE 5000

CMD ["sh", "-c", "npx prisma db push && npx tsx src/index.ts"]
