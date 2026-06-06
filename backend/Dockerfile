# Use Node.js 22 Alpine for a lightweight, secure footprint
FROM node:22-alpine

# Install necessary system packages
# (git and curl are often needed by the GitLab MCP server or scripts under the hood)
RUN apk add --no-cache git curl bash

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first (for caching layers)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend source code
COPY . .

# Expose the Express / Socket.io port
EXPOSE 3000

# Start the server using your package.json start script (ts-node server.ts)
CMD ["npm", "run", "start"]
