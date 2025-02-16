import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const botToken = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const rest = new REST().setToken(botToken);

client.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync("./commands");

for (const file of commandFiles) {
  const filePath = `./commands/${file}`;

  import(filePath)
    .then((command) => {
      if (command && "data" in command && "execute" in command) {
        client.commands.set(command.data.name, command);
        commands.push(command.data.toJSON());
      }
    })
    .catch((error) => {
      console.error(`Failed to load command at ${filePath}:`, error);
    });
}

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
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

async function registerCommands() {
  try {
    const data = await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands }
    );

    console.log(`Successfully loaded ${data.length} application (/) commands.`);
  } catch (error) {
    console.error(error);
  }
}

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  registerCommands();
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

client.login(botToken);
