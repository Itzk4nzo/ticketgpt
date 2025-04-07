import pkg from 'discord.js';
const { Client, GatewayIntentBits, ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = pkg;
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

// Set up Express server (for webhooks or web interaction if needed)
const app = express();
const PORT = process.env.PORT || 4800;  // Set port to 4800

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Express server is running on port ${PORT}`);
});

// Initialize the client with the necessary intents
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,  // Add the correct intents here
        GatewayIntentBits.MessageCreate,   // For interaction and message handling
        GatewayIntentBits.GuildMembers     // Add this for guild member updates (optional)
    ]
});

// Event handler for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Define categories with associated questions
const ticketCategories = {
    GENERAL_SUPPORT: {
        emoji: '<a:support:1353334302036856885>',
        name: 'GENERAL SUPPORT',
        questions: ['Minecraft Username', 'Issue faced', 'Platform (Java / PE / Bedrock)']
    },
    PLAYER_REPORT: {
        emoji: '<:barrier:1304789987954262046>',
        name: 'PLAYER REPORT',
        questions: ['Minecraft Username', 'Whom are you reporting?', 'What did they do?', 'Do you have any proof? (Yes/No)']
    },
    BUY: {
        emoji: '<a:Cart:1357966551508324492>',
        name: 'BUY',
        questions: ['Minecraft Username', 'What would you like to buy?', 'Payment Method']
    },
    CLAIMING: {
        emoji: '<a:Gift:1353330955535908925>',
        name: 'CLAIMING',
        questions: ['Minecraft Username', 'What did you win?', 'Do you have proof? (Yes/No)']
    },
    ISSUES: {
        emoji: '<a:notepad_gif:1296821272424218715>',
        name: 'ISSUES',
        questions: ['Minecraft Username', 'Issue faced', 'Platform (Java / PE / Bedrock)']
    }
};

// Event handler for when a message is received
client.on('messageCreate', async (message) => {
    if (message.author.bot) return; // Ignore bot messages

    // Command to trigger the ticket panel
    if (message.content === '!panel') {
        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('ticket_select')
                    .setPlaceholder('Select a Ticket Type')
                    .addOptions(
                        { label: 'General Support', value: 'GENERAL_SUPPORT' },
                        { label: 'Player Report', value: 'PLAYER_REPORT' },
                        { label: 'Buy', value: 'BUY' },
                        { label: 'Claiming', value: 'CLAIMING' },
                        { label: 'Issues', value: 'ISSUES' }
                    )
            );

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('ZionixMC • Ticket System')
            .setDescription('Please select a ticket type from the dropdown below to get started.');

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }
});

// Event handler for interactions (like selecting ticket category)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isSelectMenu()) return;

    const category = ticketCategories[interaction.values[0]];

    if (category) {
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle(`${category.name} Ticket`)
            .setDescription(`Please answer the following questions to help us assist you:`);

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Send the questions for the selected ticket category
        for (const question of category.questions) {
            await interaction.followUp(question);
        }
    }
});

// Login the bot with your token from .env
client.login(process.env.TOKEN);
