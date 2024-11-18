# Use Node.js LTS (Long Term Support) as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Create deployments directory and set permissions
RUN mkdir -p /app/deployments && chmod 777 /app/deployments

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 1001
EXPOSE 1001


# Start the server
CMD ["node", "src/server.js"] 