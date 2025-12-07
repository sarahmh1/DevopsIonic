// Script pour corriger le type de colonne dans les utilisateurs
// En cas d'erreur de contrainte CHECK sur la colonne 'type'

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./events.db');

console.log('🔧 Correction des types d\'utilisateur...\n');

// Récupérer tous les utilisateurs avec des types invalides
db.all("SELECT id, email, type FROM users WHERE type NOT IN ('organizer', 'participant')", (err, rows) => {
  if (err) {
    console.error('Erreur:', err);
    db.close();
    return;
  }

  if (rows.length === 0) {
    console.log('✅ Tous les types d\'utilisateur sont valides!');
    db.close();
    return;
  }

  console.log(`⚠️  ${rows.length} utilisateurs avec type invalide détectés:\n`);
  
  rows.forEach((user) => {
    console.log(`  - ${user.email}: type="${user.type}" (invalide)`);
    
    // Corriger en 'participant' par défaut
    db.run(
      "UPDATE users SET type = 'participant' WHERE id = ?",
      [user.id],
      function(err) {
        if (err) {
          console.error(`    ❌ Erreur: ${err.message}`);
        } else {
          console.log(`    ✅ Corrigé en 'participant'`);
        }
      }
    );
  });

  // Fermer après 1 seconde
  setTimeout(() => {
    db.close();
    console.log('\n✅ Correction terminée!');
  }, 1000);
});
