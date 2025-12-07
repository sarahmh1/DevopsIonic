# Dockerfile pour le frontend - Ionic/Angular Event Management App
# Multi-stage build pour optimiser la taille de l'image

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer toutes les dépendances (y compris devDependencies pour la construction)
RUN npm install

# Copier le code source
COPY . .

# Construire l'application Angular/Ionic
RUN npm run build

# Stage 2: Runtime
FROM node:18-alpine

WORKDIR /app

# Copier seulement les fichiers nécessaires pour le runtime
COPY package*.json ./

# Installer express pour frontend-server.js
RUN npm install --production express

# Copier le fichier frontend-server.js et les fichiers de l'application
COPY frontend-server.js ./
COPY app.html ./

# Copier les fichiers construits depuis le builder
COPY --from=builder /app/www ./www

# Exposer le port
EXPOSE 4200

# Démarrer l'application
CMD ["node", "frontend-server.js"]
