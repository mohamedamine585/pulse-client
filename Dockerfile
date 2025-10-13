
FROM nginx:alpine

# Copy the built Angular app to Nginx's HTML directory
COPY  ./dist/pulse-angular /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

