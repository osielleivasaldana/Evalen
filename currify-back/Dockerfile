FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
# Copiar schema de Prisma y generar cliente antes del build
COPY prisma ./prisma
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production

RUN apk add --no-cache dumb-init netcat-openbsd

COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package*.json ./
COPY scripts ./scripts
COPY healthcheck.js ./healthcheck.js

# Generar Prisma Client en el contenedor de runtime
RUN npx prisma generate

EXPOSE 3001

# Healthcheck simplificado - verifica que el proceso esté escuchando en el puerto
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD nc -z localhost 3001 2>&1 > /dev/null || exit 1

ENTRYPOINT ["dumb-init", "node"]
CMD ["dist/main.js"]