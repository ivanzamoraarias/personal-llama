

# 🦙 personal-llama

A NodeJs to manage Ollama with tempalte and params to be used on the CLI.

---

## 🔧 Features

- Loads SQlite database to update the context in a CAG manner. 
- Uses Ollama to send messages and context to the selected LLM.
- Launches a chatbot interface (CLI or HTTP) for natural-language Q&A  

---

## 🚀 Quickstart

### Prerequisites

- **Node.js ≥20**
- NPM or Yarn
- Ollama running on your localhost

### Installation

```bash
git clone https://github.com/ivanzamoraarias/personal-llama.git
cd personal-llama
npm install
npm start -- --client "john"
```


### Framewotk configuraation


 This module manages user-specific data and templates.
 
  ## Users Folder Structure
 
 * The `users` folder is designed to store individual user data. For each user, a separate subfolder must be created inside the `users` directory. The name of the subfolder should match the username (e.g., for a user named "John", create a folder named `john` inside `users`).
 
 * Each user folder must contain the following files:
 
  - `env.json`: Contains environment-specific configuration and settings for the user.
  - `personal.sqlite`: A SQLite database file that stores the user's personal data.
  - `template.hbs`: A Handlebars template file used to generate prompts or other user-specific content.
 *
 * ### Example Structure
 
  ```
  users/
    john/
      env.json
      personal.sqlite
      template.hbs
    alice/
      env.json
      personal.sqlite
      template.hbs
  ```
 
 * To add a new user, simply create a new folder with the username under `users` and include the required files.
 */
