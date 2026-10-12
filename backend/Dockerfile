FROM node:22-slim
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev
COPY scheduler-core.js source-reader.js ./
COPY backend/*.cjs ./backend/
USER node
ENV NODE_ENV=production
CMD ["node", "backend/server.cjs"]
