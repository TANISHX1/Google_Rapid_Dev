# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the Vite application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy the built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration to handle client-side routing
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Start Nginx by substituting the PORT variable provided by Cloud Run
CMD /bin/sh -c "envsubst '\\$PORT' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"
