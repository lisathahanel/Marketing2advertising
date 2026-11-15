FROM node:22-slim

WORKDIR /app

# Install dependencies (including tsx, which is used to start the Express server).
COPY package.json ./
RUN npm install --include=dev

# Copy the application and build the Vite frontend.
COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
