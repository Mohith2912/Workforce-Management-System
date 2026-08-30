FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev=false
COPY prisma ./prisma
COPY tsconfig.json ./
COPY src ./src
RUN npx prisma generate
EXPOSE 4000
CMD ["sh", "-c", "npx prisma db push && npx tsx prisma/seed.ts && npx tsx src/index.ts"]
