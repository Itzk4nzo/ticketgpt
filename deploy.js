
import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

try {
  console.log('🔍 Reading commands directory...');
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

  console.log(`📦 Found ${commandFiles.length} command files`);

  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
      const command = await import(`file://${filePath}`);
      if ('data' in command.default && 'execute' in command.default) {
        commands.push(command.default.data.toJSON());
        console.log(`✅ Loaded command: ${file}`);
      } else {
        console.log(`⚠️ Command at ${file} missing required properties`);
      }
    } catch (error) {
      console.error(`❌ Error loading command ${file}:`, error);
    }
  }

  const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

  console.log('🔁 Starting slash command deployment...');

  if (!process.env.TOKEN) {
    throw new Error('Bot token is not set in environment variables');
  }

  if (!process.env.CLIENT_ID) {
    throw new Error('Client ID is not set in environment variables');
  }

  const result = await rest.put(
    Routes.applicationCommands(process.env.CLIENT_ID),
    { body: commands }
  );

  console.log(`✅ Successfully deployed ${commands.length} application commands!`);
  process.exit(0);
} catch (error) {
  console.error('❌ Error during deployment:', error);
  process.exit(1);
}
