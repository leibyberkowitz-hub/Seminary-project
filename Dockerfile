# Build the three frontends, then run the API server which also serves them.
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-alpine
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ ./
COPY --from=client-build /app/client/dist /app/client/dist
EXPOSE 3001
# seed is idempotent: it runs migrations and adds demo data only on an empty database
CMD ["sh", "-c", "node seeds/seed.js && node src/index.js"]
