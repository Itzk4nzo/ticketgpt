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

      const responses = questions.map(q => ({
        name: q.label,
        value: modalResponse.fields.getTextInputValue(q.customId),
        inline: false
      }));

      const embed = new EmbedBuilder()
        .setTitle('Ticket Created')
        .setDescription(`Ticket created by ${interaction.user}`)
        .setColor('#ff0000')
        .addFields(responses);

      const welcomeEmbed = new EmbedBuilder()
        .setTitle('Welcome to Support!')
        .setDescription(`Hello ${interaction.user},\n\nA staff member will be with you shortly. Please be patient and provide any additional information that might help us assist you better.\n\n**Category**: ${category.label}\n**Status**: Open`)
        .setColor('#ff0000')
        .setTimestamp();

      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('claim-ticket')
            .setLabel('Claim Ticket')
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId('close-ticket')
            .setLabel('Close Ticket')
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId('close-with-reason')
            .setLabel('Close with Reason')
            .setStyle(ButtonStyle.Secondary)
        );

      await channel.send({ content: `<@&${process.env.STAFF_ROLE_ID}> ${interaction.user}`, embeds: [welcomeEmbed, embed], components: [buttons] });

      await modalResponse.reply({ content: `Ticket created! ${channel}`, ephemeral: true });
    } catch (error) {
      console.error('Error handling modal submission:', error);
      await interaction.followUp({ content: 'There was an error processing your ticket request.', ephemeral: true }).catch(console.error);
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'close-ticket') {
      const transcript = await createTranscript(interaction.channel);
      const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `Ticket Transcript - ${interaction.channel.name}\nClosed by: ${interaction.user.tag}`,
          files: [transcript]
        });
      }
      await interaction.channel.send({ files: [transcript] });
      setTimeout(() => interaction.channel.delete(), 5000);
      await interaction.reply({ content: 'Closing ticket...', ephemeral: true });
    }

    if (interaction.customId === 'claim-ticket') {
      const claimEmbed = new EmbedBuilder()
        .setTitle('Ticket Claimed')
        .setDescription(`This ticket has been claimed by ${interaction.user}`)
        .setColor('#ff0000')
        .setTimestamp();

      const updatedEmbed = EmbedBuilder.from(interaction.message.embeds[0])
        .setDescription(interaction.message.embeds[0].description.replace('Open', `Claimed by ${interaction.user.tag}`));

      await interaction.message.edit({
        embeds: [updatedEmbed, interaction.message.embeds[1]],
        components: [new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('close-ticket')
              .setLabel('Close Ticket')
              .setStyle(ButtonStyle.Danger),
            new ButtonBuilder()
              .setCustomId('close-with-reason')
              .setLabel('Close with Reason')
              .setStyle(ButtonStyle.Secondary)
          )]
      });

      await interaction.reply({ embeds: [claimEmbed] });
    }

    if (interaction.customId === 'close-with-reason') {
      const modal = new ModalBuilder()
        .setCustomId('close-reason-modal')
        .setTitle('Close Ticket');

      const reasonInput = new TextInputBuilder()
        .setCustomId('close-reason')
        .setLabel('Reason for closing')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setPlaceholder('Enter the reason for closing this ticket');

      modal.addComponents(new ActionRowBuilder().addComponents(reasonInput));
      await interaction.showModal(modal);
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === 'close-reason-modal') {
    const reason = interaction.fields.getTextInputValue('close-reason');
    const closeEmbed = new EmbedBuilder()
      .setTitle('Ticket Closed')
      .setDescription(`Ticket closed by ${interaction.user}\nReason: ${reason}`)
      .setColor('#ff0000')
      .setTimestamp();

    const transcript = await createTranscript(interaction.channel);
    const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);
    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `Ticket Transcript - ${interaction.channel.name}\nClosed by: ${interaction.user.tag}\nReason: ${reason}`,
        files: [transcript]
      });
    }
    await interaction.channel.send({ embeds: [closeEmbed], files: [transcript] });
    setTimeout(() => interaction.channel.delete(), 5000);
    await interaction.reply({ content: 'Closing ticket with reason...', ephemeral: true });
  }
});

client.login(process.env.TOKEN);