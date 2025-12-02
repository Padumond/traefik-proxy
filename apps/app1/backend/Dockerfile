###################
# BASE IMAGE
###################

FROM node:20-alpine AS base

# Install OpenSSL and other necessary dependencies
RUN apk add --no-cache openssl openssl-dev

# Create app directory and set permissions
WORKDIR /usr/src/app
RUN chown -R node:node /usr/src/app

###################
# DEPENDENCIES
###################

FROM base AS deps

# Copy package files
COPY --chown=node:node package*.json ./
COPY --chown=node:node prisma ./prisma/

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM deps As development

# Bundle app source
COPY --chown=node:node . .

# Use the node user from the image
USER node

###################
# BUILD FOR PRODUCTION
###################

FROM deps As build

# Copy source code
COPY --chown=node:node . .

# Build the application
RUN npm run build

# Install production dependencies only
RUN npm ci --only=production && npm cache clean --force

# Generate Prisma client for production
RUN npx prisma generate

USER node

###################
# PRODUCTION
###################

FROM base As production

# Set production environment
ENV NODE_ENV=production

# Copy necessary files from build stage
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
COPY --chown=node:node --from=build /usr/src/app/prisma ./prisma

# Copy the generated Prisma client
COPY --chown=node:node --from=build /usr/src/app/node_modules/.prisma ./node_modules/.prisma

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Expose the port
EXPOSE 3000

# Set the user
USER node

# Start the server using your project's entry point
CMD [ "node", "dist/server.js" ]
