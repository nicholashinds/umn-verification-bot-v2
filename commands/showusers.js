// ./commands/showusers.js
import {
  EmbedBuilder,
  PermissionsBitField,
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  MessageFlags,
} from "discord.js";
import { PrismaClient } from "@prisma/client";
import dotenv from "dotenv";
import { decryptText } from "../utility/encryption.js";

dotenv.config();

// create Prisma database client
const prisma = new PrismaClient();

// define /showusers command
export const data = new SlashCommandBuilder()
  .setName("showusers")
  .setDescription("Display all registered users with pagination.");

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

  // defer bot reply to allow for more than three seconds of processing
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  // get all users from database
  const users = await prisma.verification.findMany();

  // ensure there is at least one user
  if (users.length === 0) {
    return interaction.editReply({
      content: "No registered users found.",
    });
  }

  // get all discordIds
  const discordIds = users.map((user) => user.discordId);

  // get all member objects
  // if lookup fails, return an empty map
  const members = await interaction.guild.members
    .fetch({ user: discordIds })
    .catch(() => new Map());

  // format all user data for return
  const userLines = users.map((user) => {
    const member = members.get(user.discordId);
    const discordTag = member ? member.user.tag : "Unknown";
    return `${discordTag} (${user.discordId}) - ${decryptText(user.email)}`;
  });

  // setup pagination
  const itemsPerPage = 20;
  let currentPage = 0;
  const totalPages = Math.ceil(userLines.length / itemsPerPage);

  const generateEmbed = (page) => {
    // determine which users to display based on page
    const start = page * itemsPerPage;
    const end = start + itemsPerPage;
    const pageUsers = userLines.slice(start, end).join("\n");

    // create embed object with user info
    return new EmbedBuilder()
      .setColor(0x3498db)
      .setTitle(`Registered Users (Page ${page + 1}/${totalPages})`)
      .setDescription(`\`\`\`${pageUsers}\`\`\``)
      .setFooter({
        text: "Requested by " + interaction.user.tag,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();
  };

  // create a previous button to go backwards
  const prevButton = new ButtonBuilder()
    .setCustomId("prev")
    .setLabel("◀️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === 0);

  // create a next button to go forwards
  const nextButton = new ButtonBuilder()
    .setCustomId("next")
    .setLabel("▶️")
    .setStyle(ButtonStyle.Primary)
    .setDisabled(currentPage === totalPages - 1);

  // create ui component for buttons
  const buttonRow = new ActionRowBuilder().addComponents(
    prevButton,
    nextButton
  );

  // edit original message to display user info and buttons
  const message = await interaction.editReply({
    embeds: [generateEmbed(currentPage)],
    components: [buttonRow],
  });

  // create listener to monitor button interactions with eventual timeout
  const collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 60 * 1000,
  });

  // handle button clicks
  collector.on("collect", async (buttonInteraction) => {
    // page movement logic
    if (buttonInteraction.customId === "prev" && currentPage > 0) {
      currentPage--;
    } else if (
      buttonInteraction.customId === "next" &&
      currentPage < totalPages - 1
    ) {
      currentPage++;
    }

    // disable buttons at beginning and end of pagination
    prevButton.setDisabled(currentPage === 0);
    nextButton.setDisabled(currentPage === totalPages - 1);

    // update button and embeds on button press
    await buttonInteraction.update({
      embeds: [generateEmbed(currentPage)],
      components: [
        new ActionRowBuilder().addComponents(prevButton, nextButton),
      ],
    });
  });

  // clear buttons when timeout occurs
  collector.on("end", async () => {
    await message.edit({ components: [] });
  });
}
