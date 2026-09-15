# Freistell-Server fuer 2Fast4Sale — BiRefNet lite, MIT-Lizenz.
# Laeuft auf Hugging Face Spaces (Docker, CPU basic) und auf jedem
# anderen Server mit Docker.

FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

# Das Modell wird beim Bauen geladen, nicht beim Start. So ist der Server
# nach einem Neustart sofort bereit, statt erst 224 MB herunterzuladen.
RUN curl -L -o /app/model.onnx \
    https://huggingface.co/onnx-community/BiRefNet_lite-ONNX/resolve/main/onnx/model.onnx

COPY server.mjs ./

# Hugging Face Spaces startet Container als Benutzer 1000.
RUN chown -R 1000:1000 /app
USER 1000

ENV PORT=7860
EXPOSE 7860
CMD ["node", "server.mjs"]
