import amqplib from 'amqplib';
import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolves __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const queueName = 'myQueue';

try {
  const connection = await amqplib.connect('amqp://localhost');
  const channel = await connection.createChannel();
  await channel.assertQueue(queueName, { durable: false });

  console.log(`👂 Listening for messages on "${queueName}"...`);

  channel.consume(queueName, (msg) => {
    console.log('📥 Received message:', msg.content.toString());
    if (!msg) return;

    const data = JSON.parse(msg.content.toString());
    const { owner, conversationId, role, message } = data;
    const timestamp = new Date().toISOString();

    // Adjust path calculation
    const dbPath = path.join(__dirname, '..', '..', 'users', owner, 'messages.sqlite');
    console.log('📂 Database path:', dbPath);
    const db = new sqlite3.Database(dbPath);

    db.run(
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        conversationId TEXT,
        role TEXT,
        message TEXT
      )`
    );

    db.run(
      `INSERT INTO messages (timestamp, conversationId, role, message) VALUES (?, ?, ?, ?)`,
      [timestamp, conversationId, role, message],
      (err) => {
        if (err) {
          console.error('❌ Failed to insert message:', err.message);
        } else {
          console.log(`✅ Message saved for owner "${owner}"`);
          channel.ack(msg);
        }
        db.close();
      }
    );
  });
} catch (err) {
  console.error('❌ Error in consumer:', err);
}