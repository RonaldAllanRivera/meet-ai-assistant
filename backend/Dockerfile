FROM node:20-slim

WORKDIR /app

COPY package.json package-lock.json ./
COPY backend/package.json backend/package.json
COPY shared/package.json shared/package.json

RUN npm install --include=dev --workspaces --include-workspace-root

COPY . .

EXPOSE 8787

CMD ["npm", "run", "-w", "backend", "dev"]
