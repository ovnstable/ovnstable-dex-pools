# ---------------------------------------
# Production stage
# ---------------------------------------
FROM node:16.20.0-slim AS dex-aggregator-production

WORKDIR /node

COPY package*.json tsconfig.json ./

# Default build argument is dev
# ARG NODE_ENV=production
# ENV NODE_ENV=${NODE_ENV}

RUN npm install

COPY . .

RUN npm run build

CMD ["npm", "run", "start"]