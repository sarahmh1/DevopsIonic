const express = require('express');
const path = require('path');
const app = express();
const PORT = 4200;

// Servir les fichiers statiques
app.use(express.static(path.join(__dirname, 'www')));

// Route principale pour servir l'application
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

// Route pour toutes les autres requêtes (SPA fallback)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'www', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend démarré sur http://localhost:${PORT}`);
  console.log(`📱 Application de gestion d'événements disponible !`);
  console.log(`🔧 Backend API: http://localhost:3000`);
  console.log(`\n💡 Ouvrez votre navigateur sur http://localhost:${PORT}`);
});
