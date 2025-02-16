// ./commands/verify.js
import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from "discord.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { decryptEmail } from "../utility/encryption.js";

dotenv.config();

// create Prisma database client
const prisma = new PrismaClient();

const verifiedRoleId = process.env.VERIFIED_ROLE_ID;
const loggingChannelId = process.env.LOGGING_CHANNEL_ID;

// define /verify command
export const data = new SlashCommandBuilder()
  .setName("verify")
  .setDescription("Verify your email with the code sent to you.")
  .addStringOption((option) =>
    option
      .setName("code")
      .setDescription("Your verification code")
      .setRequired(true)
  );

// function to run on execution
export async function execute(interaction) {
  const discordId = interaction.user.id;
  const discordTag = interaction.user.tag;
  const userCode = interaction.options.getString("code");
  const guild = interaction.guild;

  // find user in Prisma database
  const userVerification = await prisma.verification.findUnique({
    where: { discordId },
  });

  // ensure user has gone through first step in registration process
  if (!userVerification) {
    return interaction.reply({
      content: "You have not registered yet. Use `/register` first.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // ensure user is not already verified
  if (userVerification.verified) {
    return interaction.reply({
      content: "You are already verified!",
      flags: MessageFlags.Ephemeral,
    });
  }

  // ensure the provided code matches the one sent by bot
  if (userVerification.code !== userCode) {
    return interaction.reply({
      content:
        "Incorrect verification code. Please check your email and try again.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // update verification status in Prisma database
  await prisma.verification.update({
    where: { discordId },
    data: { verified: true },
  });

  try {
    // find user's member object
    const member = await guild.members.fetch(discordId);

    // assign user verification role
    await member.roles.add(verifiedRoleId);
  } catch (error) {
    console.error("Error assigning role:", error);
    return interaction.reply({
      content: "Error assigning verification role. Please contact an admin.",
      flags: MessageFlags.Ephemeral,
    });
  }

  try {
    // find the channel for logging
    const loggingChannel = await guild.channels.fetch(loggingChannelId);

    // ensure channel exists and is text based
    if (loggingChannel && loggingChannel.isTextBased()) {
      // create embed object with details about user
      const embed = new EmbedBuilder()
        .setColor(0x00ff00)
        .setTitle("User Verified")
        .setThumbnail(interaction.user.displayAvatarURL())
        .addFields(
          { name: "Discord ID", value: `\`${discordId}\``, inline: true },
          { name: "Discord Tag", value: `\`${discordTag}\``, inline: true },
          {
            name: "Email",
            value: `\`${decryptEmail(userVerification.email)}\``,
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
            name: "Verified At",
            value: `<t:${Math.floor(Date.now() / 1000)}:F>`,
            inline: false,
          }
        )
        .setFooter({
          text: "User verification log",
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      // send the embed
      await loggingChannel.send({ embeds: [embed] });
    }
  } catch (error) {
    console.error("Failed to send verification log:", error);
  }

  // inform user they successfully verified their account
  return interaction.reply({
    content:
      "You are now verified and have been assigned the verification role.",
    flags: MessageFlags.Ephemeral,
  });
}
