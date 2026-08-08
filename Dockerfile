FROM node:20-alpine

# Needed to transcode uploaded reel videos (server-side compression + poster
# frame extraction) — see transcodeReel() in server.js.
RUN apk add --no-cache ffmpeg

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev for build)
RUN npm ci

# Copy application files
COPY . .

# Build the frontend
RUN npm run build

# Expose ports (3000 for frontend, 3001 for API)
EXPOSE 3000 3001

# Start the backend (serves both API and built frontend)
CMD ["node", "server.js"]
