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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USERS_BASE_DIR = path.join(__dirname, 'users');

const PERSONAL_DATABASE_FILE = 'personal.sqlite';




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


const args = minimist(process.argv.slice(2));
console.log(chalk.blue('Arguments:'), args);
const messageQuestion = args.question
console.log(chalk.blue('Question:'), messageQuestion);
console.log(chalk.blue('Context arg:'), args?.context);

const owner = args?.owner || 'ivan';
console.log(chalk.blue('Owner:'), owner);

let template = null
let userData = null

let userFolderPath = null;
let userDatabasePath = null


if(owner){
  userFolderPath = path.join(USERS_BASE_DIR, owner);
  userDatabasePath = path.join(userFolderPath, PERSONAL_DATABASE_FILE);
  
  let userConfig = loadUserTemplateAndEnv(owner)

  if (userConfig) {
    console.log(chalk.green(`Loaded configuration for user '${owner}'`));
    //console.log(chalk.blue('Template Source:'), userConfig.templateSource);
    template = Handlebars.compile(userConfig.templateSource);

    userData = userConfig.data;
  }
}



let context = [];
try {
  const decoded = Buffer.from(args.context, 'base64').toString('utf8');
  context = JSON.parse(decoded);
} catch (err) {
  console.error('❌ Failed to decode or parse context:', err.context);
}

console.log(chalk.blue('Context:'),  context);



const db = await open({
  filename: userDatabasePath,
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

userData = {...userData,
  familyAndFriendsData: familyAndFriendsData, 
  ownerCharacteristicsData: ownerCharacteristicsData
};

const templatePrompt = template(userData)



const ollama = new Ollama({ host: 'http://localhost:11434' });


/*
Family and Friends Data Example: ${familyAndFriendsData}

*/

// Generate Response
const response = await ollama.chat({
  model: 'gemma3',
  options:{
    num_predict: 200,
    temperature: 0.7,
  },
  messages: [
    {
      role: 'system',
      content: `${templatePrompt}`
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