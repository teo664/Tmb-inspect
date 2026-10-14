FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production DB_FILE=/app/data/fichaje.db PORT=3100
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY db.js api.js server.js backup.js ./
COPY public ./public
RUN mkdir -p /app/data && chown -R node:node /app/data
USER node
EXPOSE 3100
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://localhost:3100/health || exit 1
CMD ["node", "--no-warnings=ExperimentalWarning", "server.js"]
