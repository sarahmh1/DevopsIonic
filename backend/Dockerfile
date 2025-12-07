# Dockerfile pour le backend - Event Management API
FROM node:18-alpine

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances de production
RUN npm install --production

# Copier le reste du code
COPY . .

# Exposer le port
EXPOSE 3000

# Variables d'environnement par défaut
ENV PORT=3000
ENV JWT_SECRET=your-secret-key-change-in-production

# Démarrer l'application
CMD ["npm", "start"]
