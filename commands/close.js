import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { createTranscript } from '../utils/createTranscript.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Close the current ticket')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // Optional: Limit in permission
  async execute(interaction) {
    const staffRoleId = process.env.STAFF_ROLE_ID;

    // Check if user has the staff role
    if (!interaction.member.roles.cache.has(staffRoleId)) {
      await interaction.reply({ content: '❌ You do not have permission to close tickets.', ephemeral: true });
      return;
    }

    const channel = interaction.channel;

    // Check if current channel is a ticket (you can adjust this logic if needed)
    if (!channel.name.startsWith('general_support') &&
        !channel.name.startsWith('player_report') &&
        !channel.name.startsWith('buy') &&
        !channel.name.startsWith('claiming') &&
        !channel.name.startsWith('issues')) {
      await interaction.reply({ content: '❌ This is not a ticket channel.', ephemeral: true });
      return;
    }

    // Create and send transcript
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
