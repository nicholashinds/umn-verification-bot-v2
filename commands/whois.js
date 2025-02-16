// ./commands/whois.js
import {
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { decryptText } from "../utility/encryption.js";

dotenv.config();

// create Prisma database client
const prisma = new PrismaClient();

// define /whois command
export const data = new SlashCommandBuilder()
  .setName("whois")
  .setDescription("Retrieve a user's verification details.")
  .addStringOption((option) =>
    option
      .setName("userid")
      .setDescription("The Discord ID of the user.")
      .setRequired(true)
  );

// function to run on execution
export async function execute(interaction) {
  if (
    // ensure only admins can run this command
    !interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)
  ) {
    return interaction.reply({
      content: "You do not have permission to use this command.",
      flags: MessageFlags.Ephemeral,
    });
  }

  const discordId = interaction.options.getString("userid");

  // find user in Prisma database
  const userVerification = await prisma.verification.findUnique({
    where: { discordId },
  });

  // ensure user is in the database
  if (!userVerification) {
    return interaction.reply({
      content: "No verification record found for this user.",
      flags: MessageFlags.Ephemeral,
    });
  }

  // retrieve decrypted email
  const decryptedEmail = decryptText(userVerification.email);

  // create embed object with details about user
  const embed = new EmbedBuilder()
    .setColor(userVerification.verified ? 0x00ff00 : 0xff0000)
    .setTitle("User Verification Info")
    .setThumbnail(
      interaction.guild.members.cache.get(discordId)?.user.displayAvatarURL() ||
        null
    )
    .addFields(
      { name: "Discord ID", value: `\`${discordId}\``, inline: true },
      { name: "Email", value: `\`${decryptedEmail}\``, inline: true },
      {
        name: "Verified",
        value: userVerification.verified ? "Yes" : "No",
        inline: true,
      },
      {
        name: "Registered At",
        value: `<t:${Math.floor(
          new Date(userVerification.createdAt).getTime() / 1000
        )}:F>`,
        inline: false,
      },
      {
        name: "Last Updated",
        value: `<t:${Math.floor(
          new Date(userVerification.updatedAt).getTime() / 1000
        )}:F>`,
        inline: false,
      }
    )
    .setFooter({
      text: "Requested by " + interaction.user.tag,
      iconURL: interaction.user.displayAvatarURL(),
    })
    .setTimestamp();

  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
