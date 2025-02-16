// ./commands/register.js
import { SlashCommandBuilder, MessageFlags } from "discord.js";
import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import crypto from "crypto";
import dotenv from "dotenv";
import { encryptEmail } from "../utility/encryption.js";

dotenv.config();

// create Prisma database client
const prisma = new PrismaClient();

// create cooldown for users to prevent spam
const registerCooldown = new Map();

const emailUsername = process.env.EMAIL_USERNAME;
const emailPassword = process.env.EMAIL_APP_PASSWORD;

// define /register command
export const data = new SlashCommandBuilder()
  .setName("register")
  .setDescription("Register your email address for verification.")
  .addStringOption((option) =>
    option
      .setName("email")
      .setDescription("Your email address")
      .setRequired(true)
  );

// function to run on execution
export async function execute(interaction) {
  const discordId = interaction.user.id;
  const email = interaction.options.getString("email");
  const timeNow = Date.now();

  // five minute cooldown to prevent spam
  const cooldownTime = 5 * 60 * 1000; // ms

  // ensure only @umn.edu email addresses are used for verification
  if (!email.endsWith("@umn.edu")) {
    return interaction.reply({
      content: "You must verify with a `@umn.edu` email!",
      flags: MessageFlags.Ephemeral,
    });
  }

  if (registerCooldown.has(discordId)) {
    // get user's last request time
    const lastRequest = registerCooldown.get(discordId);

    // determine if last request was made within five minutes
    if (timeNow - lastRequest < cooldownTime) {
      const timeLeft = Math.ceil(
        (cooldownTime - (timeNow - lastRequest)) / 1000
      );
      return interaction.reply({
        content: `You must wait ${timeLeft} seconds before registering again.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  // determine if user is already in database
  const existingUser = await prisma.verification.findUnique({
    where: { discordId },
  });

  // if user is in database and verified, let them know
  if (existingUser && existingUser.verified) {
    return interaction.reply({
      content: "You are already verified!",
      flags: MessageFlags.Ephemeral,
    });
  }

  // create random six digit verification code
  const verificationCode = crypto.randomInt(100000, 999999).toString();

  // encrypt user's email
  const encryptedEmail = encryptEmail(email);

  // update/insert the database with user info
  await prisma.verification.upsert({
    where: { discordId },
    update: { email: encryptedEmail, code: verificationCode, verified: false },
    create: { discordId, email: encryptedEmail, code: verificationCode },
  });

  try {
    // defer bot reply to allow for more than three seconds of processing
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    // call email verification function
    await sendVerificationEmail(email, verificationCode);

    // set cooldown on user
    registerCooldown.set(discordId, timeNow);

    // after email verification function is done, update reply to tell users
    // the next steps
    await interaction.editReply({
      content:
        "A verification code has been sent to your email. Please use `/verify` to submit the code.",
    });
  } catch (error) {
    console.error(error);
    await interaction.editReply({
      content:
        "Failed to send email. Please try again later or contact an administrator.",
    });
  }
}

// email verification function
async function sendVerificationEmail(email, code) {
  // setup transporter for how emails will be sent
  // in this case, we use a gmail email address
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: emailUsername,
      pass: emailPassword,
    },
  });

  // define the email content
  const mailOptions = {
    from: `"Discord Verification Bot" <${emailUsername}>`,
    to: email,
    subject: "Discord Verification Code",
    text: `Your verification code is: ${code}. Use \`/verify\` to submit the code.\n\n
    Do not share your verification code with anyone other than the verification bot.\n\n
    This is an automated email. Please do not reply.`,
  };

  // actually send the email with the code
  await transporter.sendMail(mailOptions);
}
