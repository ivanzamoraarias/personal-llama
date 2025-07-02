#!/usr/bin/env node
import { Ollama } from 'ollama';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import chalk from 'chalk';
import { nanoid } from 'nanoid';
import minimist from 'minimist';


const PERSONAL_DATABASE_FILE = 'personal.sqlite';


const args = minimist(process.argv.slice(2));
console.log(chalk.blue('Arguments:'), args);
const messageQuestion = args.question
console.log(chalk.blue('Question:'), messageQuestion);
console.log(chalk.blue('Context arg:'), args?.context);

let context = [];
try {
  const decoded = Buffer.from(args.context, 'base64').toString('utf8');
  context = JSON.parse(decoded);
} catch (err) {
  console.error('❌ Failed to decode or parse context:', err.message);
}

console.log(chalk.blue('Context:'),  context);




const ollama = new Ollama({ host: 'http://localhost:11434' });
const db = await open({
  filename: PERSONAL_DATABASE_FILE,
  driver: sqlite3.Database
});



// Fetch Family Data
const familyAndFriends = await db.all('SELECT * FROM friends');
const familyAndFriendsData = familyAndFriends.map(p => 
  `${p.relation}: ${p.name}, birthday: ${p.birthday}`
).join('\n');


const ownerCharacteristics = await db.all('SELECT * FROM characteristics');
const ownerCharacteristicsData = ownerCharacteristics.map(p => 
  `${p.name}: ${p.specification}`
).join('\n');

/*
Family and Friends Data Example: ${familyAndFriendsData}

*/

// Generate Response
const response = await ollama.chat({
  model: 'llama3',
  options:{
    num_predict: 200,
    temperature: 0.4,
  },
  messages: [
    {
      role: 'system',
      content: `
      You must ask the user for confirmation before sharing private family details. Never list them all at once.
      You are the personal assistant of Ivan(complete name Fausto Ivan Zamora Arias), with knows Ivan's information.
      You have private information about the user's family. 
      Only reveal specific details when explicitly asked. 
      Never volunteer all information at once.
      Never share private data unless the question is clear and specific.
      If unsure, ask for clarification first.
      If you don't know the answer, say "I don't know".
      Answer as you are talking to Ivan's friend.
      Don not show the context or the family and friends data as raw data, just as conversation.
      You are in Ecuador.

      Default Language: 
      Spanish
      Family and Friends: 
      ${familyAndFriendsData}

      Ivan's characteristics:
      ${ownerCharacteristicsData}
      `
    },
    ...context,
    {
    role: 'user',
    content: `
   
     ${messageQuestion}
    
    `
    },
    
],
  requestId: nanoid() // Unique ID for tracking
});

console.log(chalk.green('\nResponse:'), response.message.content);
await db.close();