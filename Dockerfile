FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY src/ ./src/
COPY server.js ./

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Change ownership of the app directory
RUN chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3000

# Updated healthcheck for ES modules
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node --input-type=module -e "import('http').then(({default: http}) => { http.get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }); }).catch(() => process.exit(1))"

CMD ["npm", "start"]