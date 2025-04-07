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
} from "discord.js";
import dotenv from "dotenv";
import express from "express";
dotenv.config();

// EXPRESS SETUP FOR 24/7 HOSTING (Replit)
const app = express();
app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(3000, '0.0.0.0', () => console.log("✅ Express server is up on port 3000"));

// CLIENT SETUP
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction],
});

// CONFIGS
const panelEmbedColor = 0xffd700;
const welcomeEmbedColor = 0x00bfff;
const summaryEmbedColor = 0xffffff;

const ticketCategories = [
  {
    id: "general_support",
    label: "GENERAL SUPPORT",
    emoji: "<a:support:1353334302036856885>",
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: "Your In game name" },
      { label: "What is the issue you are facing?" },
      { label: "What's your Platform?", placeholder: "Java / PE / Bedrock" },
    ],
  },
  {
    id: "player_report",
    label: "PLAYER REPORT",
    emoji: "<:barrier:1304789987954262046>",
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: "Your In game name" },
      { label: "Whom are you reporting?", placeholder: "His username (IGN)" },
      { label: "What did he do?" },
      { label: "Do you have any proof?", placeholder: "Yes / No" },
    ],
  },
  {
    id: "buy",
    label: "BUY",
    emoji: "<a:Cart:1357966551508324492>",
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: "Your In game name" },
      { label: "What would you like to buy?" },
      { label: "What's your Payment Method?" },
    ],
  },
  {
    id: "claiming",
    label: "CLAIMING",
    emoji: "<a:Gift:1353330955535908925>",
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: "Your In game name" },
      { label: "What did you win?" },
      { label: "Do you have any proof?", placeholder: "Yes / No" },
    ],
  },
  {
    id: "issues",
    label: "ISSUES",
    emoji: "<a:notepad_gif:1296821272424218715>",
    questions: [
      { label: "What's Your Minecraft Username?", placeholder: "Your In game name" },
      { label: "What's the issue you are facing?" },
      { label: "What's your platform?", placeholder: "Java / PE / Bedrock" },
    ],
  },
];

// Check environment variables
const requiredEnvVars = [
  'TOKEN',
  'STAFF_ROLE_ID',
  'GENERAL_SUPPORT_CATEGORY',
  'PLAYER_REPORT_CATEGORY',
  'BUY_CATEGORY',
  'CLAIMING_CATEGORY',
  'ISSUES_CATEGORY'
];

// ON READY
client.once("ready", async () => {
  try {
    // Check for missing environment variables
    const missingVars = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      process.exit(1);
    }

    await client.application.commands.set([
      { name: "panel", description: "Send the ticket panel embed" },
    ]);
    console.log(`✅ ${client.user.tag} is online and slash command is set!`);
  } catch (err) {
    console.error("❌ Error setting slash commands:", err);
  }
});

// INTERACTION HANDLER
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // PANEL COMMAND
    if (interaction.isChatInputCommand() && interaction.commandName === "panel") {
      const embed = new EmbedBuilder()
        .setTitle("ZionixMC • Ticket")
        .setDescription(
          "ZionixMC | Support Tickets\nTickets are used to provide support to members of the ZionixMC!\nPlease don't waste time with tickets and try to respond quickly. Only open a ticket if necessary.",
        )
        .setColor(panelEmbedColor);

      const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket-category")
        .setPlaceholder("Select a category")
        .addOptions(
          ticketCategories.map((c) => ({
            label: c.label,
            value: c.id,
            emoji: c.emoji,
          })),
        );

      await interaction.reply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(menu)],
      });
    }

    // CATEGORY SELECT
    if (interaction.isStringSelectMenu() && interaction.customId === "ticket-category") {
      const category = ticketCategories.find((c) => c.id === interaction.values[0]);
      if (!category) return;

      const modal = new ModalBuilder()
        .setCustomId(`modal-${category.id}`)
        .setTitle(`Ticket - ${category.label}`);

      const rows = category.questions.map((q, i) =>
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(`q${i}`)
            .setLabel(q.label)
            .setPlaceholder(q.placeholder || "")
            .setStyle(TextInputStyle.Short)
            .setRequired(true),
        ),
      );

      modal.addComponents(...rows.slice(0, 5));
      await interaction.showModal(modal);
    }

    // MODAL SUBMIT
    if (interaction.isModalSubmit() && interaction.customId.startsWith("modal-")) {
      const catId = interaction.customId.replace("modal-", "");
      const category = ticketCategories.find((c) => c.id === catId);
      if (!category) return;

      const answers = category.questions.map((q, i) => ({
        question: q.label,
        answer: interaction.fields.getTextInputValue(`q${i}`),
      }));

      const channelName = `ticket-${interaction.user.username.toLowerCase().replace(/[^a-z0-9]/g, "") || "user"}`;

      const channel = await interaction.guild.channels.create({
        name: channelName,
        parent: process.env[`${catId.toUpperCase()}_CATEGORY`],
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
        .setTitle("📝 Ticket Summary")
        .setColor(summaryEmbedColor)
        .setDescription(
          answers.map((a) => `**${a.question}**\n${a.answer}`).join("\n\n"),
        );

      const welcome = new EmbedBuilder()
        .setTitle("🎟️ Welcome to your ticket!")
        .setDescription("Our staff will be with you shortly.")
        .setColor(welcomeEmbedColor);

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("claim").setLabel("Claim").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("close").setLabel("Close").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("close_reason").setLabel("Close with Reason").setStyle(ButtonStyle.Secondary),
      );

      const pingMsg = await channel.send({
        content: `<@&${process.env.STAFF_ROLE_ID}> <@${interaction.user.id}>`,
      });
      setTimeout(() => pingMsg.delete().catch(() => {}), 3000);

      await channel.send({ embeds: [welcome] });
      await channel.send({ embeds: [summary], components: [buttons] });

      await interaction.reply({
        content: `✅ Ticket created: <#${channel.id}>`,
        ephemeral: true,
      });
    }

    // BUTTON HANDLER
    if (interaction.isButton()) {
      const channel = interaction.channel;

      if (interaction.customId === "claim") {
        await interaction.reply({
          content: `🔒 Claimed by ${interaction.user.tag}`,
          ephemeral: false,
        });
      } else if (interaction.customId === "close") {
        await channel.send(`🔒 Ticket closed by ${interaction.user.tag}`);
        channel.delete();
      } else if (interaction.customId === "close_reason") {
        const modal = new ModalBuilder()
          .setCustomId("close_reason_modal")
          .setTitle("Close with Reason")
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("reason")
                .setLabel("Why are you closing this ticket?")
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true),
            ),
          );
        await interaction.showModal(modal);
      }
    }

    // CLOSE WITH REASON SUBMIT
    if (interaction.isModalSubmit() && interaction.customId === "close_reason_modal") {
      const reason = interaction.fields.getTextInputValue("reason");
      await interaction.channel.send(
        `🔒 Ticket closed by ${interaction.user.tag}\n**Reason:** ${reason}`,
      );
      interaction.channel.delete();
    }
  } catch (error) {
    console.error("❌ Interaction error:", error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: "❌ An error occurred.", ephemeral: true });
    } else {
      await interaction.reply({ content: "❌ An error occurred.", ephemeral: true });
    }
  }
});

// LOGIN
console.log('🔄 Attempting to login to Discord...');
client.login(process.env.TOKEN).then(() => {
  console.log('✅ Successfully logged in to Discord!');
  console.log('🤖 Bot User:', client.user?.tag);
}).catch((err) => {
  console.error("❌ Failed to login:", err.message);
  if (!process.env.TOKEN) {
    console.error("❗ TOKEN environment variable is missing!");
  } else if (err.message.includes('invalid token')) {
    console.error("❗ The provided TOKEN appears to be invalid. Please check if your TOKEN is correct in the Secrets tab");
  }
});
