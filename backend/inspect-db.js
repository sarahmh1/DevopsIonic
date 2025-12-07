// Script pour vérifier la structure de la base de données SQLite

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./events.db');

console.log('=== STRUCTURE DE LA BASE DE DONNÉES ===\n');

// Récupérer les tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
  if (err) {
    console.error('Erreur:', err);
    return;
  }

  tables.forEach((table) => {
    console.log(`\n📋 Table: ${table.name}`);
    console.log('─'.repeat(50));

    db.all(`PRAGMA table_info(${table.name})`, (err, columns) => {
      if (!err) {
        columns.forEach((col) => {
          const type = col.type.padEnd(10);
          const notNull = col.notnull ? '[NOT NULL]' : '';
          const pk = col.pk ? '[PRIMARY KEY]' : '';
          console.log(`  ${col.name.padEnd(20)} ${type} ${notNull} ${pk}`);
        });
      }
    });
  });

  // Afficher les statistiques après 500ms
  setTimeout(() => {
    console.log('\n\n📊 STATISTIQUES:');
    console.log('─'.repeat(50));

    db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
      tables.forEach((table) => {
        db.get(`SELECT COUNT(*) as count FROM ${table.name}`, (err, result) => {
          console.log(`${table.name}: ${result.count} lignes`);
        });
      });

      setTimeout(() => {
        db.close();
        console.log('\n✅ Inspection terminée!');
      }, 500);
    });
  }, 500);
});
