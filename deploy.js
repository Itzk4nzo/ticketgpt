// deploy.js

import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load .env variables
config();

// Resolve __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prepare the commands array
const commands = [];
const commandsPath = path.join(__dirname, 'commands');

(async () => {
  try {
    console.log('🔍 Reading commands directory...');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    console.log(`📦 Found ${commandFiles.length} command file(s)`);

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);
      try {
        const command = await import(`file://${filePath}`);
        if ('data' in command.default && 'execute' in command.default) {
          commands.push(command.default.data.toJSON());
          console.log(`✅ Loaded command: ${file}`);
        } else {
          console.warn(`⚠️ Skipped ${file} - missing "data" or "execute"`);
        }
      } catch (error) {
        console.error(`❌ Failed to load command ${file}:`, error);
      }
    }

    // Check env vars
    if (!process.env.TOKEN || !process.env.CLIENT_ID) {
      throw new Error('Missing TOKEN or CLIENT_ID in .env');
    }

    // Register commands using Discord REST API
    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    console.log('🚀 Deploying slash commands...');

    const result = await rest.put(
      Routes.applicationCommands(process.env.CLIENT_ID),
      { body: commands }
    );

    console.log(`✅ Successfully deployed ${commands.length} command(s)!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    process.exit(1);
  }
})();
