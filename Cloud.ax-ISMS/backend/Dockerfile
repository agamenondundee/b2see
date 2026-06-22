FROM node:20-alpine
WORKDIR /app

# OpenSSL is required by the Prisma engines on Alpine.
RUN apk add --no-cache openssl

COPY package.json ./
RUN npm install

COPY . .
RUN npx prisma generate

EXPOSE 4000

# Sync the schema, load the reference data, then start the API. db push is used in
# place of migrations for a first deployment; switch to prisma migrate for change
# control once the schema is stable.
CMD ["sh", "-c", "npx prisma db push --skip-generate && npm run seed && npm run start"]
