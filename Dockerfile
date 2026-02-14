FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy application files
COPY . .

# Build the frontend
RUN npm run build

# Install serve to serve static files
RUN npm install -g serve

# Expose ports (3000 for frontend, 3001 for API)
EXPOSE 3000 3001

# Start both frontend and backend
CMD ["sh", "-c", "serve -s dist -l 3000 & node server.js"]
