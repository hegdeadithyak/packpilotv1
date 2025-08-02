# Step 1: Use official Node.js image for build
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Clean previous installs (as per your script)
RUN rm -rf node_modules package-lock.json && \
    npm cache clean --force

# Copy all source files
COPY . .

# Install dependencies
RUN npm install --force

# Build the Next.js app
RUN npm run build

# Step 2: Create production image
FROM node:18-alpine AS runner

WORKDIR /app

# Copy only the necessary files from the builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
