FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --include=dev --legacy-peer-deps
COPY . .
RUN chmod +x node_modules/.bin/vite node_modules/.bin/esbuild || true
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
