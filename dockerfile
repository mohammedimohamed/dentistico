# --- STAGE 1: Builder ---
    FROM node:22-alpine AS builder
    WORKDIR /app
    
    # Copy package files and install ALL dependencies
    COPY package*.json ./
    RUN npm ci
    
    # Copy the rest of your code and build
    COPY . .
    RUN npm run build
    
    # Remove devDependencies to keep the final image slim
    RUN npm prune --production
    
    # --- STAGE 2: Runner ---
    FROM node:22-alpine AS runner
    WORKDIR /app
    
    # Install sqlite runtime dependencies (if needed by better-sqlite3)
    RUN apk add --no-cache python3 make g++ 
    
    # Set environment to production
    ENV NODE_ENV=production
    ENV PORT=10000
    
    # Create a directory for the persistent database
    RUN mkdir -p /app/data
    
    # Copy built app and production node_modules from builder
    COPY --from=builder /app/build ./build
    COPY --from=builder /app/node_modules ./node_modules
    COPY --from=builder /app/package.json ./package.json
    
    # Expose the port
    EXPOSE 10000
    
    # Copy startup script (optional, for better ORIGIN handling)
    COPY --from=builder /app/start.js ./start.js
    
    # Set default ORIGIN (override with -e ORIGIN=... when running)
    ENV ORIGIN=http://localhost:10000
    
    # Start the application
    CMD ["node", "build/index.js"]