
// Import des dépendances
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cron = require('node-cron');
const nodemailer = require('nodemailer');


//configuration basique
const app = express();
const PORT = process.env.PORT || 3000;

// IMPORTANT: changer cette valeur en variable d'environnement en production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';


// Middlewares Express
// - CORS pour autoriser les requêtes depuis le client
// - bodyParser pour parser JSON et form-url-encoded
app.use(cors({
  origin: '*', // Permet toutes les origines (ou spécifie: 'http://206.189.251.173')
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


// Base de données SQLite locale
// - fichier : ./events.db
// - sqlite3 gère la création si le fichier n'existe pas
const db = new sqlite3.Database('./events.db');

// Initialisation de la base de données
db.serialize(() => {
  // Table des utilisateurs
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('organizer', 'participant')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Table des événements
  db.run(`CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    location TEXT NOT NULL,
    description TEXT,
    organizer_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users (id)
  )`);

  // Table des inscriptions
  db.run(`CREATE TABLE IF NOT EXISTS registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    UNIQUE(event_id, user_id)
  )`);

  // Table des notifications
  db.run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    sent BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (event_id) REFERENCES events (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});


// Configuration du transporteur email (nodemailer)
const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE || 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});


// Middleware d'authentification JWT
// - Vérifie la présence d'un header Authorization: Bearer <token>
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // Pas de token -> accès non autorisé
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }

  // Vérification du token (asynchrone via callback)
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      // Token invalide ou expiré
      return res.status(403).json({ message: 'Token invalide' });
    }
    // On attache le payload décodé à req.user pour les routes protégées
    req.user = user;
    next();
  });
};


// Route: POST /api/register
//  Crée un nouvel utilisateur (organizer | participant)
//  Hash le mot de passe avec bcrypt avant de le stocker
//  Retourne un JWT et l'objet user minimal (id, email, type)

app.post('/api/register', async (req, res) => {
  const { email, password, type } = req.body;

  console.log('Incoming register request:', { email, type });

  if (!email || !password || !type) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  if (!['organizer', 'participant'].includes(type)) {
    return res.status(400).json({ message: 'Type d\'utilisateur invalide' });
  }

  try {
    // Hash du mot de passe (ne stockons jamais de mot de passe en clair)
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.run(
      'INSERT INTO users (email, password, type) VALUES (?, ?, ?)',
      [email, hashedPassword, type],
      function(err) {
        if (err) {
          // Gestion d'une erreur classique : email déjà utilisé
          if (err.message.includes('UNIQUE constraint failed')) {
            return res.status(400).json({ message: 'Cet email est déjà utilisé' });
          }
          return res.status(500).json({ message: 'Erreur lors de la création du compte' });
        }

        // Créer un JWT avec les données de l'utilisateur
        const user = { id: this.lastID, email, type };
        const token = jwt.sign(user, JWT_SECRET, { expiresIn: '24h' });

        res.status(201).json({
          message: 'Compte créé avec succès',
          token,
          user
        });
      }
    );
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});


// Route: POST /api/login
//  Authentifie un utilisateur avec email et mot de passe
//  Utilise bcrypt pour comparer le mot de passe
//  Retourne un JWT

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email et mot de passe requis' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
    if (err || !user) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Comparer le mot de passe avec le hash
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Email ou mot de passe incorrect' });
    }

    // Créer un JWT
    const token = jwt.sign({ id: user.id, email: user.email, type: user.type }, JWT_SECRET, { expiresIn: '24h' });
    res.json({
      message: 'Connexion réussie',
      token,
      user: { id: user.id, email: user.email, type: user.type }
    });
  });
});


// Route: GET /api/events
// Récupère tous les événements
app.get('/api/events', (req, res) => {
  db.all('SELECT * FROM events', (err, events) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la récupération des événements' });
    }
    res.json(events);
  });
});


// Route: GET /api/events/:id
// Récupère un événement par ID
app.get('/api/events/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM events WHERE id = ?', [id], (err, event) => {
    if (err || !event) {
      return res.status(404).json({ message: 'Événement non trouvé' });
    }
    res.json(event);
  });
});


// Route: POST /api/events
// Crée un nouvel événement (authentifié, réservé aux organisateurs)
app.post('/api/events', authenticateToken, (req, res) => {
  const { title, date, location, description } = req.body;
  const organizer_id = req.user.id;

  if (!title || !date || !location) {
    return res.status(400).json({ message: 'Titre, date et lieu sont requis' });
  }

  db.run(
    'INSERT INTO events (title, date, location, description, organizer_id) VALUES (?, ?, ?, ?, ?)',
    [title, date, location, description || '', organizer_id],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la création de l\'événement' });
      }
      res.status(201).json({ id: this.lastID, title, date, location, description, organizer_id });
    }
  );
});


// Route: GET /api/my-events
// Récupère les événements créés par l'organisateur connecté
app.get('/api/my-events', authenticateToken, (req, res) => {
  const organizer_id = req.user.id;
  
  db.all(
    'SELECT * FROM events WHERE organizer_id = ?',
    [organizer_id],
    (err, events) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la récupération de vos événements' });
      }
      res.json(events);
    }
  );
});


// Route: POST /api/events/:id/register
// Inscrit l'utilisateur authentifié à un événement
app.post('/api/events/:id/register', authenticateToken, (req, res) => {
  const event_id = req.params.id;
  const user_id = req.user.id;

  db.run(
    'INSERT INTO registrations (event_id, user_id) VALUES (?, ?)',
    [event_id, user_id],
    function(err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(400).json({ message: 'Vous êtes déjà inscrit à cet événement' });
        }
        return res.status(500).json({ message: 'Erreur lors de l\'inscription' });
      }
      res.status(201).json({ message: 'Inscription réussie' });
    }
  );
});


// Route: GET /api/events/:id/participants
// Récupère la liste des participants à un événement
app.get('/api/events/:id/participants', (req, res) => {
  const event_id = req.params.id;
  db.all(
    'SELECT u.id, u.email FROM users u JOIN registrations r ON u.id = r.user_id WHERE r.event_id = ?',
    [event_id],
    (err, participants) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la récupération des participants' });
      }
      res.json(participants);
    }
  );
});


// ========== NOTIFICATIONS ==========

// Route: POST /api/notifications
// Crée une notification planifiée
app.post('/api/notifications', authenticateToken, (req, res) => {
  const { event_id, user_id, title, message, scheduled_date } = req.body;

  if (!event_id || !user_id || !title || !message || !scheduled_date) {
    return res.status(400).json({ message: 'Tous les champs sont requis' });
  }

  db.run(
    'INSERT INTO notifications (event_id, user_id, title, message, scheduled_date) VALUES (?, ?, ?, ?, ?)',
    [event_id, user_id, title, message, scheduled_date],
    function(err) {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la création de la notification' });
      }
      res.status(201).json({ id: this.lastID, event_id, user_id, title, message, scheduled_date });
    }
  );
});


// Tâche cron : Envoyer les notifications planifiées chaque minute
cron.schedule('* * * * *', () => {
  const now = new Date().toISOString();

  db.all(
    'SELECT * FROM notifications WHERE sent = FALSE AND scheduled_date <= ?',
    [now],
    (err, notifications) => {
      if (err || !notifications || notifications.length === 0) return;

      notifications.forEach((notif) => {
        // Récupérer l'email de l'utilisateur
        db.get('SELECT email FROM users WHERE id = ?', [notif.user_id], (err, user) => {
          if (err || !user) return;

          // Envoyer l'email
          transporter.sendMail({
            from: process.env.EMAIL_USER || 'noreply@example.com',
            to: user.email,
            subject: notif.title,
            text: notif.message
          }, (mailErr) => {
            if (!mailErr) {
              // Marquer la notification comme envoyée
              db.run('UPDATE notifications SET sent = TRUE WHERE id = ?', [notif.id]);
            }
          });
        });
      });
    }
  );
});


// ========== ROUTES DE DIAGNOSTIC ==========

// Route: GET /health
// Vérifie que le serveur fonctionne
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});


// ========== DÉMARRAGE DU SERVEUR ==========

app.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
  console.log(`Conseil: définir NODE_ENV=production et JWT_SECRET en production.`);
});

module.exports = app;
