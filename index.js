
import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ticketCategories, questionFlows } from './config.js';
import { createTranscript } from './utils/createTranscript.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ]
});

client.commands = new Collection();

// Load commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = await import(`file://${filePath}`);
  if ('data' in command.default && 'execute' in command.default) {
    client.commands.set(command.default.data.name, command.default);
  }
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing this command!', ephemeral: true });
    }
  }

  if (interaction.isStringSelectMenu() && interaction.customId === 'select-category') {
    const category = ticketCategories.find(cat => cat.value === interaction.values[0]);
    if (!category) return;

    const channel = await interaction.guild.channels.create({
      name: `ticket-${interaction.user.username}`,
      type: ChannelType.GuildText,
      parent: category.folderId,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: ['ViewChannel'],
        },
        {
          id: interaction.user.id,
          allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'],
        },
      ],
    });

    // Create and show modal
    const modal = new ModalBuilder()
      .setCustomId(`ticket-modal-${category.value}`)
      .setTitle(`${category.label} Ticket`);

    const questions = questionFlows[category.value];
    const actionRows = questions.map(question => {
      const textInput = new TextInputBuilder()
        .setCustomId(question.customId)
        .setLabel(question.label)
        .setPlaceholder(question.placeholder)
        .setStyle(TextInputStyle.Short)
        .setRequired(question.required);

      return new ActionRowBuilder().addComponents(textInput);
    });

    modal.addComponents(actionRows);
    await interaction.showModal(modal);
    
    try {
      const modalResponse = await interaction.awaitModalSubmit({
        time: 300000,
        filter: i => i.customId === `ticket-modal-${category.value}`
      });

      const responses = questions.map(q => ({
        name: q.label,
        value: modalResponse.fields.getTextInputValue(q.customId),
        inline: false
      }));

      const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`Ticket created by ${interaction.user}`)
        .setColor('#ffff00')
        .addFields(responses);

      const buttons = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('close-ticket')
          .setLabel('Close Ticket')
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('claim-ticket')
          .setLabel('Claim Ticket')
          .setStyle(ButtonStyle.Success)
      );

    await channel.send({ content: `<@&${process.env.STAFF_ROLE_ID}> ${interaction.user}`, embeds: [embed], components: [buttons] });
    setTimeout(() => channel.bulkDelete(1), 1000);

    await interaction.reply({ content: `Ticket created! ${channel}`, ephemeral: true });
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'close-ticket') {
      const transcript = await createTranscript(interaction.channel);
      await interaction.channel.send({ files: [transcript] });
      setTimeout(() => interaction.channel.delete(), 5000);
      await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
    }

    if (interaction.customId === 'claim-ticket') {
      await interaction.reply({ content: `Ticket claimed by ${interaction.user}!` });
    }
  }
});

client.login(process.env.TOKEN);
