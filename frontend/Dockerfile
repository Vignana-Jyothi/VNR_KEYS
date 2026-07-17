# VNR Keys - Frontend (React + Vite)
# Stage 1: Build the static bundle. Vite bakes VITE_* vars in at build time,
# so they MUST be passed as --build-arg, not just env vars at runtime.
FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_API_URL
ARG VITE_SOCKET_URL
ARG VITE_APP_NAME
ARG VITE_APP_VERSION
ARG VITE_FRONTEND_URL

ENV VITE_API_URL=$VITE_API_URL \
    VITE_SOCKET_URL=$VITE_SOCKET_URL \
    VITE_APP_NAME=$VITE_APP_NAME \
    VITE_APP_VERSION=$VITE_APP_VERSION \
    VITE_FRONTEND_URL=$VITE_FRONTEND_URL

RUN npm run build

# Stage 2: Serve the built static files with nginx
FROM nginx:alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
