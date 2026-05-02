FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# The backend expects .env in the parent directory as per index.ts:
# dotenv.config({ path: path.resolve(__dirname, "../.env") });
# For Cloud Run, we will provide environment variables directly.

EXPOSE 3001
CMD ["npm", "start"]
