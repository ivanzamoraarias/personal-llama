//import sqlite3 from 'sqlite3';


sqlite3.verbose();

import sqlite3 from 'sqlite3';
sqlite3.verbose();


const db = new sqlite3.Database('./users/name/personal.sqlite', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});


const createFriendsTable = false
const createCharacteristicsTable = true;


// Create the friends table
createFriendsTable && db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            relation TEXT NOT NULL DEFAULT 'friend',
            birthday TEXT
        )
    `);

    // Example: Insert some friends (edit as needed)
    const stmt = db.prepare("INSERT INTO friends (name, relation, birthday) VALUES (?, ?, ?)");
    stmt.run("Milton Pozo", "friend", "1993");
   

   
    stmt.finalize();

    // Query and print all friends
    db.each("SELECT id, name, birthday FROM friends", (err, row) => {
        if (err) throw err;
        console.log(`${row.id}: ${row.name} - ${row.birthday}`);
    });
});



createCharacteristicsTable && db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS characteristics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specification TEXT NOT NULL
        )
    `);

    // Example: Insert some friends (edit as needed)
    const stmt = db.prepare("INSERT INTO characteristics (name, specification) VALUES (?, ?)");
   stmt.run("birthday", "tell the birthday of the person");

    stmt.finalize();

    // Query and print all friends
    db.each("SELECT id, name FROM characteristics", (err, row) => {
        if (err) throw err;
        console.log(`${row.id}: ${row.name} - ${row.birthday}`);
    });
});


// Close the database after all queries are done
db.close();