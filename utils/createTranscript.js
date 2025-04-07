import { AttachmentBuilder } from 'discord.js';

export async function createTranscript(channel) {
  const messages = await channel.messages.fetch({ limit: 100 });
  const content = messages
    .map(m => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.content}`)
    .reverse()
    .join('\n');

  const buffer = Buffer.from(content, 'utf-8');
  const file = new AttachmentBuilder(buffer, { name: `transcript-${channel.id}.txt` });

  return file;
}
