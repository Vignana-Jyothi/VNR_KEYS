# VNR Keys - Backend (Node.js + Express + MongoDB)
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of the backend source
COPY . .

ENV NODE_ENV=production

# Internal container port - always 5000 regardless of dev/prod.
# Host-side port mapping (6203 for prod, 6213 for dev) is handled in docker-compose.
EXPOSE 5000

CMD ["node", "index.js"]
