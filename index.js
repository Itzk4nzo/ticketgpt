import { Client, GatewayIntentBits, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, ModalBuilder, TextInputBuilder, TextInputStyle, StringSelectMenuBuilder } from 'discord.js';
import http from 'http';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ticketCategories, questionFlows } from './config.js';
import { createTranscript } from './utils/createTranscript.js';
import { MessageFlags } from 'discord-api-types/v10';

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

client.on('messageCreate', async message => {
  if (message.content.toLowerCase() === '!panel') {
    const embed = new EmbedBuilder()
      .setTitle('ZionixMC • Ticket')
      .setDescription('ZionixMC | Support Tickets\nTickets are used to provide support to members of the ZionixMC!\nPlease don\'t waste time with tickets and try to respond quickly. Only open a ticket if necessary.')
      .setColor('#ff0000');

    const select = new StringSelectMenuBuilder()
      .setCustomId('select-category')
      .setPlaceholder('Choose a ticket category')
      .addOptions([
        {
          label: 'GENERAL SUPPORT',
          value: 'general_support',
          description: 'Help with general server issues.',
          emoji: '<a:support:1353334302036856885>',
        },
        {
          label: 'PLAYER REPORT',
          value: 'player_report',
          description: 'Report a player breaking rules.',
          emoji: '<:barrier:1361651824968339588>',
        },
        {
          label: 'BUY',
          value: 'buy',
          description: 'To Purchase Anything.',
          emoji: '<:cart:1361652253278343260>',
        },
        {
          label: 'CLAIMING',
          value: 'claiming',
          description: 'Claim rewards or prizes.',
          emoji: '<a:Gift:1353330955535908925>',
        },
        {
          label: 'ISSUES',
          value: 'issues',
          description: 'Report technical problems.',
          emoji: '<a:note:1361652613656875059>',
        }
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await message.channel.send({ embeds: [embed], components: [row] });
  }
});

client.on('interactionCreate', async interaction => {
  if (interaction.isCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: 'There was an error executing this command!', flags: MessageFlags.Ephemeral });
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

      // Count user's existing tickets across all support categories
      const userTickets = interaction.guild.channels.cache.filter(channel => 
        channel.name.toLowerCase().includes(interaction.user.username.toLowerCase()) &&
        ticketCategories.some(cat => channel.parentId === process.env[`CATEGORY_${cat.value.toUpperCase()}`])
      );

      if (userTickets.size >= 2) {
        await modalResponse.reply({
          content: '❌ You already have 2 tickets open. Please close your existing tickets before creating a new one.',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const channel = await interaction.guild.channels.create({
        name: `${category.value}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: interaction.values[0] === 'buy' ? process.env.CATEGORY_BUY :
               interaction.values[0] === 'general_support' ? process.env.CATEGORY_GENERAL_SUPPORT :
               interaction.values[0] === 'player_report' ? process.env.CATEGORY_PLAYER_REPORT :
               interaction.values[0] === 'claiming' ? process.env.CATEGORY_CLAIMING :
               process.env.CATEGORY_ISSUES,
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

      await modalResponse.reply({ content: `Ticket created! ${channel}`, flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('Error handling modal submission:', error);
      await interaction.followUp({ content: 'There was an error processing your ticket request.', flags: MessageFlags.Ephemeral }).catch(console.error);
    }
  }

  if (interaction.isButton()) {
    if (interaction.customId === 'close-ticket') {
      await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      const transcript = await createTranscript(interaction.channel);
      const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);
      if (transcriptChannel) {
        await transcriptChannel.send({
          content: `Ticket Transcript - ${interaction.channel.name}\nClosed by: ${interaction.user.tag}`,
          files: [transcript]
        });
      }
      await interaction.channel.send({ files: [transcript] });
      await interaction.editReply({ content: 'Closing ticket...', flags: MessageFlags.Ephemeral });
      setTimeout(() => interaction.channel.delete(), 5000);
    }

    if (interaction.customId === 'claim-ticket') {
      const staffRoleId = process.env.STAFF_ROLE_ID;
      if (!interaction.member.roles.cache.has(staffRoleId)) {
        await interaction.reply({ content: '❌ You do not have permission to claim tickets.', flags: MessageFlags.Ephemeral });
        return;
      }

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
    await interaction.reply({ content: 'Closing ticket with reason...', flags: MessageFlags.Ephemeral });
  }
});

// Create HTTP server for uptime monitoring
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('Bot is alive!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Server is running on port 3000');
});

client.login(process.env.TOKEN);
