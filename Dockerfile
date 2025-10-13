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

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom Nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy the static build output
COPY --from=builder /app/dist/*/browser /usr/share/nginx/html

# Create necessary directories and set proper permissions
RUN mkdir -p /var/run/nginx && \
    chown -R nginx:nginx /var/run/nginx /var/cache/nginx && \
    chmod -R 755 /var/run/nginx

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
