const express = require('express');
const path = require('path');
const app = express();
const PORT = 4200;

// Servir les fichiers statiques
app.use(express.static('.'));

// Route pour servir l'application Angular
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur de développement démarré sur http://localhost:${PORT}`);
  console.log(`📱 Application de gestion d'événements disponible !`);
});

