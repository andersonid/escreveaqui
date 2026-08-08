FROM docker.io/node:22-alpine

WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --omit=dev --silent

COPY server.js .

RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 1234

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -q --tries=1 --spider http://localhost:1234/ || exit 1

CMD ["node", "server.js"]
