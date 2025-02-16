// ./commands/unregister.js
import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { decryptText } from "../utility/encryption.js";

dotenv.config();

// create Prisma database client
const prisma = new PrismaClient();

const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
const loggingChannelId = process.env.LOGGING_CHANNEL_ID;

// define /unregister command
export const data = new SlashCommandBuilder()
  .setName("unregister")
  .setDescription("Unregister yourself and remove your verification status.");

// function to run on execution
export async function execute(interaction) {
  const discordId = interaction.user.id;
  const discordTag = interaction.user.tag;
  const guild = interaction.guild;

  // find user in Prisma database
  const userVerification = await prisma.verification.findUnique({
    where: { discordId },
  });

  // ensure user is registered and verified
  if (!userVerification) {
    return interaction.reply({
      content: "You are not registered.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    // remove user from database
    await prisma.verification.delete({ where: { discordId } });
  } catch (error) {
    console.error("Error deleting user from database:", error);
    return interaction.reply({
      content: "An error occurred while unregistering. Please try again later.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    // find user's member object
    const member = await guild.members.fetch(discordId);

    // remove user's verification role
    if (verifiedRoleId && member.roles.cache.has(verifiedRoleId)) {
      await member.roles.remove(verifiedRoleId);
    }
  } catch (error) {
    console.warn("Could not remove role:", error);
  }

  try {
    // find the channel for logging
    const loggingChannel = await guild.channels.fetch(loggingChannelId);

    // ensure channel exists and is text based
    if (loggingChannel && loggingChannel.isTextBased()) {
      // create embed object with details about user
      const embed = new EmbedBuilder()
        .setColor(0xff0000)
        .setTitle("User Unregistered")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "Discord ID", value: `\`${discordId}\``, inline: true },
          { name: "Discord Tag", value: `\`${discordTag}\``, inline: true },
          {
            name: "Email",
            value: `\`${decryptText(userVerification.email)}\``,
            inline: false,
          },
          {
            name: "Registered At",
            value: `<t:${Math.floor(
              new Date(userVerification.createdAt).getTime() / 1000
            )}:F>`,
            inline: false,
          },
          {
            name: "Unregistered At",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false,
          }
        )
        .setFooter({
          text: "User unregistration log",
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await loggingChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Failed to send unregistration log:", error);
  }

  // inform user they successfully unregistered their account
  return interaction.reply({
    content:
      "You have been unregistered and your verified role has been removed.",
    flags: MessageFlags.Ephemeral,
  });
}
