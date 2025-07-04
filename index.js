#!/usr/bin/env node
import { Ollama } from 'ollama';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import chalk from 'chalk';
import { nanoid } from 'nanoid';
import minimist from 'minimist';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Handlebars from 'handlebars';
import amqplib from 'amqplib';


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_BASE_DIR = path.join(__dirname, 'users');

const PERSONAL_DATABASE_FILE = 'personal.sqlite';
const MESSAGES_DATABASE_FILE = 'messages.sqlite';

const UPDATE_MESSAGES_QUEUE_URL = 'amqp://localhost';
const UPDATE_MESSAGES_QUEUE_NAME = 'myQueue';
const OLLAMA_URL = 'http://localhost:11434';

async function sendMessageToQueue(message) {
  try {
    const connection = await amqplib.connect(UPDATE_MESSAGES_QUEUE_URL);
    const channel = await connection.createChannel();
  
    await channel.assertQueue(UPDATE_MESSAGES_QUEUE_NAME, { durable: false });
    channel.sendToQueue(UPDATE_MESSAGES_QUEUE_NAME, Buffer.from(JSON.stringify(message)));
  
    console.log('✅ Message sent:', message);
    await channel.close();
    await connection.close();
  } catch (err) {
    console.error('❌ Error sending message:', err);
  }
}


function loadUserTemplateAndEnv(userIdentifier) {
  
  const templateFilePath = path.join(userFolderPath, 'template.hbs');
  const envFilePath = path.join(userFolderPath, 'env.json');

  try {
    // Check if the user's folder exists
    if (!fs.existsSync(userFolderPath)) {
      console.error(`Error: User folder not found for '${userIdentifier}' at ${userFolderPath}`);
      return null;
    }

    // Read the template file
    const templateSource = fs.readFileSync(templateFilePath, 'utf8');

    // Read and parse the environment data file
    const envDataString = fs.readFileSync(envFilePath, 'utf8');
    const data = JSON.parse(envDataString);

    return {
      templateSource: templateSource,
      data: data
    };
  } catch (error) {
    console.error(`Error loading configuration for user '${userIdentifier}':`, error.message);
    return null;
  }
}

async function getTemplatePropmtFromPersonalDb() {
  const db = await open({
    filename: userDatabasePath,
    driver: sqlite3.Database
  });

  // Fetch Family Data
  const familyAndFriends = await db.all('SELECT * FROM friends');
  const familyAndFriendsData = familyAndFriends.map(p => `${p.relation}: ${p.name}, birthday: ${p.birthday}`
  ).join('\n');


  const ownerCharacteristics = await db.all('SELECT * FROM characteristics');
  const ownerCharacteristicsData = ownerCharacteristics.map(p => `${p.name}: ${p.specification}`
  ).join('\n');

  userData = {
    ...userData,
    familyAndFriendsData: familyAndFriendsData,
    ownerCharacteristicsData: ownerCharacteristicsData
  };

  const templatePrompt = template(userData);
  await db.close();
  return templatePrompt;
}


async function getMessagesFromMessagesDb(conversationId) {
  if (!conversationId) {
    console.error('❌ No conversationId provided for fetching messages.');
    return undefined;
  }
  try {
    const db = await open({
      filename: userMessagesDatabasePath,
      driver: sqlite3.Database
    });

    const messages = await db.all('SELECT * FROM messages WHERE conversationId = ?', conversationId);
    const messagesObjects = 
      messages.map(
        m => ({
          role: m.role, 
          content: m.message,
        })
      );


    await db.close();
    return messagesObjects;
  } catch (error) {
    console.error('❌ Error fetching messages from database:', error.message);
    return undefined;
  }
}



const args = minimist(process.argv.slice(2));
console.log(chalk.blue('Arguments:'), args);
const messageQuestion = args.question;
const conversationId = args?.conversationId;
console.log(chalk.blue('Question:'), messageQuestion);

const owner = args?.owner || 'ivan';
console.log(chalk.blue('Owner:'), owner);

let template = null
let userData = null

let userFolderPath = null;
let userDatabasePath = null
let userMessagesDatabasePath = null;


if(owner){
  userFolderPath = path.join(USERS_BASE_DIR, owner);
  userDatabasePath = path.join(userFolderPath, PERSONAL_DATABASE_FILE);
  userMessagesDatabasePath = path.join(userFolderPath, MESSAGES_DATABASE_FILE);
  
  let userConfig = loadUserTemplateAndEnv(owner)

  if (userConfig) {
    console.log(chalk.green(`Loaded configuration for user '${owner}'`));
    //console.log(chalk.blue('Template Source:'), userConfig.templateSource);
    template = Handlebars.compile(userConfig.templateSource);

    userData = userConfig.data;
  }
}

await sendMessageToQueue({
  owner: owner, 
  conversationId,
  role: 'user', 
  message: messageQuestion
});





const templatePrompt = await getTemplatePropmtFromPersonalDb();
const messages = await getMessagesFromMessagesDb(conversationId);


const ollama = new Ollama({ host: OLLAMA_URL});


// Generate Response
const response = await ollama.chat({
  model: 'gemma3',
  options:{
    num_predict: 300,
    temperature: 0.7,
  },
  messages: [
    {
      role: 'system',
      content: `${templatePrompt}`
    },
    ...messages,
    {
    role: 'user',
    content: `
   
     ${messageQuestion}
    
    `
    },
    
],
  requestId: nanoid() // Unique ID for tracking
});

await sendMessageToQueue({
  owner: owner, 
  conversationId,
  role: 'assistant', 
  message: response.message.content
});

console.log(chalk.green('\nResponse:'), response.message.content);



