// commands/panel.js
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Display the support ticket panel'),
  async execute(interaction) {
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
          emoji: '<:barrier:1304789987954262046>',
        },
        {
          label: 'BUY',
          value: 'buy',
          description: 'To Purchase Anything.',
          emoji: '<a:Cart:1357966551508324492>',
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
          emoji: '<a:notepad_gif:1296821272424218715>',
        }
      ]);

    const row = new ActionRowBuilder().addComponents(select);
    await interaction.reply({ embeds: [embed], components: [row] });
  },
};
