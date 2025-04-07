
import { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, EmbedBuilder, ButtonStyle } from 'discord.js';
import express from 'express';
import { config } from 'dotenv';

config();

const app = express();
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ]
});

// Categories
const categories = {
  general_support: {
    name: 'General Support',
    emoji: '🛠️',
    questions: [
      { question: 'Minecraft Username', placeholder: 'Your In game name' },
      { question: 'Issue faced', placeholder: '' },
      { question: 'Platform', placeholder: 'Java / PE / Bedrock' }
    ]
  },
  player_report: {
    name: 'Player Report',
    emoji: '🚫',
    questions: [
      { question: 'Minecraft Username', placeholder: '' },
      { question: 'Whom are you reporting', placeholder: 'Their username' },
      { question: 'What did they do?', placeholder: '' },
      { question: 'Do you have proof?', placeholder: 'Yes / No' }
    ]
  },
  buy: {
    name: 'Buy',
    emoji: '💸',
    questions: [
      { question: 'Minecraft Username', placeholder: '' },
      { question: 'What would you like to buy?', placeholder: '' },
      { question: 'Payment Method', placeholder: '' }
    ]
  },
  claiming: {
    name: 'Claiming',
    emoji: '🎁',
    questions: [
      { question: 'Minecraft Username', placeholder: '' },
      { question: 'What did you win?', placeholder: '' },
      { question: 'Do you have proof?', placeholder: 'Yes / No' }
    ]
  },
  issues: {
    name: 'Issues',
    emoji: '📋',
    questions: [
      { question: 'Minecraft Username', placeholder: '' },
      { question: 'Issue faced', placeholder: '' },
      { question: 'Platform', placeholder: 'Java / PE / Bedrock' }
    ]
  }
};

// Start the bot
client.once('ready', () => {
  console.log(`${client.user.tag} is online!`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'createTicket') {
    // Create a new ticket modal
    const modal = {
      title: 'Create a Ticket',
      customId: 'ticketModal',
      components: [
        {
          type: 1,
          components: [
            {
              type: 4,
              customId: 'category',
              label: 'Choose Ticket Category',
              options: Object.keys(categories).map(category => ({
                label: categories[category].name,
                value: category,
                emoji: categories[category].emoji
              }))
            }
          ]
        }
      ]
    };
    await interaction.showModal(modal);
  }

  if (interaction.customId === 'ticketModal') {
    const category = interaction.fields.getTextInputValue('category');
    const selectedCategory = categories[category];

    let questions = selectedCategory.questions;
    let responses = [];
    let i = 0;

    const askQuestion = async () => {
      if (i < questions.length) {
        await interaction.reply({ content: questions[i].question, ephemeral: true });
        i++;
        setTimeout(askQuestion, 5000);
      } else {
        const channel = await interaction.guild.channels.create({
          name: `ticket-${interaction.user.username}`,
          type: 'text',
          parent: process.env[`CATEGORY_${category.toUpperCase()}`],
          reason: `Support ticket created by ${interaction.user.tag}`
        });

        const embed = new EmbedBuilder()
          .setTitle(`${selectedCategory.name} - Ticket Summary`)
          .setColor('#3498db')
          .setDescription(`Category: ${selectedCategory.name}`)
          .addFields({ name: 'Questions and Responses', value: responses.map((r, index) => `${selectedCategory.questions[index].question}: ${r}`).join('\n') });

        await channel.send({ embeds: [embed] });

        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('claimTicket')
              .setLabel('Claim')
              .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
              .setCustomId('closeTicket')
              .setLabel('Close')
              .setStyle(ButtonStyle.Danger)
          );

        await channel.send({ content: 'Staff, please claim or close the ticket.', components: [row] });
      }
    };

    askQuestion();
  }
});

client.on('messageCreate', async message => {
  if (message.content === '!ticket') {
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('createTicket')
        .setLabel('Create Ticket')
        .setStyle(ButtonStyle.Primary)
    );
    const embed = new EmbedBuilder()
      .setColor('#3498db')
      .setTitle('ZionixMC Support')
      .setDescription('Click the button below to create a support ticket.');

    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

// Express server to handle HTTP requests
app.get('/', (req, res) => {
  res.send('ZionixMC ticket bot is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Express server is up on port ${port}`);
});

// Log in the bot
client.login(process.env.TOKEN);
