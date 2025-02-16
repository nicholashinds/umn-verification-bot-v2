import { SlashCommandBuilder, MessageFlags } from "discord.js";

export const data = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!");

export async function execute(interaction) {
  await interaction.reply({
    content: "Pong!",
    flags: MessageFlags.Ephemeral,
  });
}
