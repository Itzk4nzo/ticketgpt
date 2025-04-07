import pkg from 'discord.js';
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = pkg;
import dotenv from 'dotenv';
import express from 'express';

// Load environment variables
dotenv.config();

// Set up Express server (for webhooks or web interaction if needed)
const app = express();
const PORT = process.env.PORT || 4983;  // Changed the port here to 4983

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
        GatewayIntentBits.MessageContent
    ]
});

// Event handler for when the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// Define categories
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
                new ButtonBuilder()
                    .setCustomId('support_ticket')
                    .setLabel('Create Support Ticket')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('report_ticket')
                    .setLabel('Create Report Ticket')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('buy_ticket')
                    .setLabel('Create Buy Ticket')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('claim_ticket')
                    .setLabel('Create Claim Ticket')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('issue_ticket')
                    .setLabel('Create Issue Ticket')
                    .setStyle(ButtonStyle.Primary)
            );

        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('ZionixMC • Ticket System')
            .setDescription('Please select a ticket type by clicking a button below to get started.');

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
    }

    // Handle button interactions
    if (message.componentType === 'BUTTON') {
        const category = ticketCategories[message.customId.toUpperCase() + '_TICKET'];

        if (category) {
            const embed = new EmbedBuilder()
                .setColor(0x00FF00)
                .setTitle(`${category.name} Ticket`)
                .setDescription(`Please answer the following questions to help us assist you:`);

            await message.channel.send({ embeds: [embed] });

            // Send the questions for the selected ticket category
            for (const question of category.questions) {
                await message.channel.send(question);
            }
        }
    }
});

// Event handler for when a modal interaction is received (if using modals)
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId.startsWith('ticket_')) {
        const categoryName = interaction.customId.split('_')[1];
        const category = ticketCategories[categoryName];

        if (category) {
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${category.name} Ticket`)
                .setDescription('Please provide the necessary information to open a ticket.');

            await interaction.reply({ embeds: [embed], ephemeral: true });

            // Ask questions dynamically from the category
            for (let i = 0; i < category.questions.length; i++) {
                await interaction.channel.send(category.questions[i]);
            }
        }
    }
});

// Login the bot with your token from .env
client.login(process.env.TOKEN);
