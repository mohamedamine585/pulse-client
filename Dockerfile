# =========================================
# Stage 1: Build the Angular Application
# =========================================
ARG NODE_VERSION=18-alpine
ARG NGINX_VERSION=alpine

FROM node:${NODE_VERSION} AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --legacy-peer-deps
COPY . .
RUN npm run build

# =========================================
# Stage 2: Prepare Nginx to Serve Static Files
# =========================================

FROM nginx:${NGINX_VERSION} AS runner

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static build output
COPY --from=builder /app/dist/*/browser /usr/share/nginx/html

# Create nginx pid directory and set proper permissions
RUN mkdir -p /var/cache/nginx /var/run && \
    chown -R nginx:nginx /var/cache/nginx /var/run

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
