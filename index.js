import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  PermissionsBitField,
  Events,
} from 'discord.js';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

// EXPRESS SERVER FOR 24/7 HOSTING (REPLIT)
const app = express();
app.get('/', (req, res) => res.send('Bot is running!'));
app.listen(3000, '0.0.0.0', () => console.log('✅ Express server is up on port 3000'));

// CLIENT SETUP
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

// === CONFIGURATION ===
const panelEmbedColor = 0xffd700;
const welcomeEmbedColor = 0x00bfff;
const summaryEmbedColor = 0xffffff;

const ticketCategories = [
  {
    id: 'general_support',
    label: 'GENERAL SUPPORT',
    emoji: '<a:support:1353334302036856885>',
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: 'Your In game name' },
      { label: 'What is the issue you are facing?' },
      { label: "What's your Platform?", placeholder: 'Java / PE / Bedrock' },
    ],
  },
  {
    id: 'player_report',
    label: 'PLAYER REPORT',
    emoji: '<:barrier:1304789987954262046>',
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: 'Your In game name' },
      { label: 'Whom are you reporting?', placeholder: 'His username (IGN)' },
      { label: 'What did he do?' },
      { label: 'Do you have any proof?', placeholder: 'Yes / No' },
    ],
  },
  {
    id: 'buy',
    label: 'BUY',
    emoji: '<a:Cart:1357966551508324492>',
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: 'Your In game name' },
      { label: 'What would you like to buy?' },
      { label: "What's your Payment Method?" },
    ],
  },
  {
    id: 'claiming',
    label: 'CLAIMING',
    emoji: '<a:Gift:1353330955535908925>',
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: 'Your In game name' },
      { label: 'What did you win?' },
      { label: 'Do you have any proof?', placeholder: 'Yes / No' },
    ],
  },
  {
    id: 'issues',
    label: 'ISSUES',
    emoji: '<a:notepad_gif:1296821272424218715>',
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: 'Your In game name' },
      { label: "What's the issue you are facing?" },
      { label: "What's your platform?", placeholder: 'Java / PE / Bedrock' },
    ],
  },
];

const requiredEnvVars = [
  'TOKEN',
  'STAFF_ROLE_ID',
  'GENERAL_SUPPORT_CATEGORY',
  'PLAYER_REPORT_CATEGORY',
  'BUY_CATEGORY',
  'CLAIMING_CATEGORY',
  'ISSUES_CATEGORY',
];

// === READY EVENT ===
client.once('ready', async () => {
  const missing = requiredEnvVars.filter((v) => !process.env[v]);
  if (missing.length) {
    console.error('❌ Missing env variables:', missing.join(', '));
    process.exit(1);
  }

  await client.application.commands.set([{ name: 'panel', description: 'Send the ticket panel' }]);
  console.log(`🤖 ${client.user.tag} is online and ready!`);
});

// === INTERACTION HANDLER ===
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // /panel command
    if (interaction.isChatInputCommand() && interaction.commandName === 'panel') {
      const embed = new EmbedBuilder()
        .setTitle('ZionixMC • Ticket')
        .setDescription(
          'ZionixMC | Support Tickets\nTickets are used to support members of the ZionixMC!\nPlease don’t waste time with tickets. Respond quickly. Only open if necessary.',
        )
        .setColor(panelEmbedColor);

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket-category')
        .setPlaceholder('Select a category')
        .addOptions(
          ticketCategories.map((cat) => ({
            label: cat.label,
            value: cat.id,
            emoji: cat.emoji,
          })),
        );

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(menu)],
      });
    }

    // Category select
    if (interaction.isStringSelectMenu() && interaction.customId === 'ticket-category') {
      const category = ticketCategories.find((c) => c.id === interaction.values[0]);
      if (!category) return;

      const modal = new ModalBuilder()
        .setCustomId(`modal-${category.id}`)
        .setTitle(`Ticket - ${category.label}`);

      const inputs = category.questions.slice(0, 5).map((q, i) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`q${i}`)
            .setLabel(q.label)
            .setPlaceholder(q.placeholder || '')
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

      modal.addComponents(...inputs);
      await interaction.showModal(modal);
    }

    // Modal submit
    if (interaction.isModalSubmit() && interaction.customId.startsWith('modal-')) {
      const catId = interaction.customId.replace('modal-', '');
      const category = ticketCategories.find((c) => c.id === catId);
      if (!category) return;

      const answers = category.questions.map((q, i) => ({
        question: q.label,
        answer: interaction.fields.getTextInputValue(`q${i}`),
      }));

      const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
      const parentId = process.env[`${catId.toUpperCase()}_CATEGORY`];

      const channel = await interaction.guild.channels.create({
        name: channelName,
        parent: parentId,
        permissionOverwrites: [
          {
            id: interaction.guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel],
          },
          {
            id: interaction.user.id,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
          {
            id: process.env.STAFF_ROLE_ID,
            allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
          },
        ],
      });

      const summary = new EmbedBuilder()
        .setTitle('📝 Ticket Summary')
        .setColor(summaryEmbedColor)
        .setDescription(answers.map((a) => `**${a.question}**\n${a.answer}`).join('\n\n'));

      const welcome = new EmbedBuilder()
        .setTitle('🎟️ Welcome to your ticket!')
        .setDescription('Our staff will be with you shortly.')
        .setColor(welcomeEmbedColor);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('claim').setLabel('Claim').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('close').setLabel('Close').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('close_reason').setLabel('Close with Reason').setStyle(ButtonStyle.Secondary),
      );

      const pingMsg = await channel.send({
        content: `<@&${process.env.STAFF_ROLE_ID}> <@${interaction.user.id}>`,
      });
      setTimeout(() => pingMsg.delete().catch(() => {}), 3000);

      await channel.send({ embeds: [welcome] });
      await channel.send({ embeds: [summary], components: [buttons] });

      await interaction.reply({ content: `✅ Ticket created: <#${channel.id}>`, ephemeral: true });
    }

    // Button interactions
    if (interaction.isButton()) {
      const channel = interaction.channel;

      if (interaction.customId === 'claim') {
        await interaction.reply({ content: `🔒 Claimed by ${interaction.user.tag}`, ephemeral: false });
      } else if (interaction.customId === 'close') {
        await channel.send(`🔒 Ticket closed by ${interaction.user.tag}`);
        await channel.delete();
      } else if (interaction.customId === 'close_reason') {
        const modal = new ModalBuilder()
          .setCustomId('close_reason_modal')
          .setTitle('Close with Reason')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId('reason')
                .setLabel('Why are you closing this ticket?')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true),
            ),
          );
        await interaction.showModal(modal);
      }
    }

    // Close with reason
    if (interaction.isModalSubmit() && interaction.customId === 'close_reason_modal') {
      const reason = interaction.fields.getTextInputValue('reason');
      await interaction.channel.send(`🔒 Ticket closed by ${interaction.user.tag}\n**Reason:** ${reason}`);
      await interaction.channel.delete();
    }
  } catch (err) {
    console.error('❌ Interaction error:', err);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: '❌ An error occurred.', ephemeral: true });
    } else {
      await interaction.reply({ content: '❌ An error occurred.', ephemeral: true });
    }
  }
});

// === LOGIN ===
console.log('🔄 Attempting to login to Discord...');
client.login(process.env.TOKEN).then(() => {
  console.log('✅ Successfully logged in!');
}).catch((err) => {
  console.error('❌ Failed to login:', err.message);
  if (!process.env.TOKEN) {
    console.error('❗ Missing TOKEN in your .env file!');
  } else if (err.message.includes('invalid token')) {
    console.error('❗ Invalid bot token. Please check it.');
  }
});
