// index.js
import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  REST,
  Routes,
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

// define required .env variables
const requiredEnvVars = [
  "DISCORD_BOT_TOKEN",
  "DISCORD_CLIENT_ID",
  "GUILD_ID",
  "VERIFIED_ROLE_ID",
  "LOGGING_CHANNEL_ID",
  "DATABASE_URL",
  "ENCRYPTION_KEY",
  "EMAIL_USERNAME",
  "EMAIL_APP_PASSWORD",
];

// determine if any variables are null or empty strings
const missingVars = requiredEnvVars.filter(
  (envVar) => !process.env[envVar] || process.env[envVar].trim() === ""
);

// stop bot before runtime on missing variables
if (missingVars.length > 0) {
  console.error(
    "Missing or empty required environment variables:",
    missingVars.join(", ")
  );
  process.exit(1);
}

// grab variables from .env
const botToken = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.GUILD_ID;

// create a bot distance
const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

// create a REST API handler
const rest = new REST().setToken(botToken);

// create command storages for both the client and registration
client.commands = new Collection();
const commands = [];

// read all command filenames
const commandFiles = fs.readdirSync("./commands");

// loop over all files in command directory
for (const file of commandFiles) {
  const filePath = `./commands/${file}`;

  // for each file, store command in storage for usage
  import(filePath).then((command) => {
    client.commands.set(command.data.name, command);
    commands.push(command.data.toJSON());
  });
}

// handle command usage (InteractionCreate) events
client.on(Events.InteractionCreate, async (interaction) => {
  // ensure slash '/' commands only
  if (!interaction.isChatInputCommand()) return;

  // get specific command
  const command = interaction.client.commands.get(interaction.commandName);

  // ensure command exists in storage
  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  // execute command
  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      // either followUp or reply (depends on command) on error
      await interaction.followUp({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "There was an error while executing this command!",
        flags: MessageFlags.Ephemeral,
      });
    }
  }
});

// function to register all commands
async function registerCommands() {
  try {
    // send PUT request to Discord's API to register commands
    // uses specified guild for instant registration
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`Successfully loaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
}

// wait for bot to start running
client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);

  // register commands
  registerCommands();

  // set presence (activity status of bot, only for appearance purposes)
  client.user.setPresence({
    activities: [
      {
        name: "Verification Simulator",
        type: ActivityType.Playing,
      },
    ],
    status: "dnd",
  });
});

// actually start the bot
client.login(botToken);
