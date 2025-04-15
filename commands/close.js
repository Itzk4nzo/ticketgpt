import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createTranscript } from '../utils/createTranscript.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    const staffRoleId = process.env.STAFF_ROLE_ID;

    if (!interaction.member.roles.cache.has(staffRoleId)) {
      return interaction.reply({ content: '❌ You do not have permission to close tickets.', ephemeral: true });
    }

    const channel = interaction.channel;

    if (!['general_support', 'player_report', 'buy', 'claiming', 'issues'].some(prefix => channel.name.startsWith(prefix))) {
      return interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
    }

    const transcript = await createTranscript(channel);
    const transcriptChannel = interaction.guild.channels.cache.get(process.env.TRANSCRIPT_CHANNEL_ID);

    if (transcriptChannel) {
      await transcriptChannel.send({
        content: `📩 Ticket Transcript - ${channel.name}\nClosed by: ${interaction.user.tag}`,
        files: [transcript]
      });
    }

    await interaction.reply({ content: '✅ Ticket will be closed in 5 seconds...', ephemeral: true });
    await channel.send({ content: '📁 Transcript saved. Ticket will be closed shortly.', files: [transcript] });

    setTimeout(() => channel.delete().catch(console.error), 5000);
  }
};
