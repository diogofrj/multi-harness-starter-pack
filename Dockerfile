FROM node:20-alpine

WORKDIR /app

# Copia arquivos do projeto
COPY package.json ./
COPY server.mjs ./
COPY scripts ./scripts
COPY .devtool ./.devtool

EXPOSE 3000

ENV PORT=3000
ENV NODE_ENV=production

CMD ["node", "server.mjs"]
