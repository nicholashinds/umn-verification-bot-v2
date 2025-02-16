# Discord Bot for UMN Email Verification

A small Discord bot that verifies the authenticity of users via email verification.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/package-manager) (version 16 or later)
- A Discord bot token and client ID
- A guild (server) ID, verification role ID, and logging channel ID
- A gmail email address and app password

## Getting Started

### 1. Clone the Repository

- Clone this repository to your local machine:

```
https://github.com/nicholashinds/umn-verification-bot-v2.git
cd umn-verification-bot-v2
```

### 2. Install Dependencies

- Install the required Node.js packages:

```
npm install
```

### 3. Create a `.env` file

- Create a `.env` file in the root of your project with the following content:

```
DISCORD_BOT_TOKEN=
DISCORD_CLIENT_ID=
GUILD_ID=
VERIFIED_ROLE_ID=
LOGGING_CHANNEL_ID=

DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY=

EMAIL_USERNAME=
EMAIL_APP_PASSWORD=
```

### 4. Create Encryption Key (DO NOT SHARE)

- In the terminal, run the following command and save its output to the `.env` file as `ENCRYPTION_KEY`:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 5. Get Your Discord Bot Token

1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **Bot** settings, generate and copy the **Token** inside the `.env` file as `DISCORD_BOT_TOKEN`.
3. Create a new application and under **OAuth2** > **OAuth2 URL Generator** settings, select the `bot` scope and then the `Manage Roles`, `View Channels`, and `Send Messages`, permissions. Then, copy and paste the provided URL into a browser to invite the bot to your server.

### 5. Get Your Discord Bot Client ID

1. Once again, go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Under **OAuth2** settings, copy the **Client ID** inside the `.env` as `DISCORD_CLIENT_ID`.

### 6. Discord Guild ID

1. Right-click the server name in the top left of Discord and select **Copy Server ID**.
   - Note: If you don't see **Copy Server ID**, go to **User Settings** > **Advanced** and enable **Developer Mode**.
2. Paste the copied ID inside the `.env` file as `GUILD_ID`.

### 7. Discord Role ID

1. Under **Server Settings** > **Roles**, right-click the desired role to be given to users upon verification and select **Copy Role ID**.
2. Paste the copied ID inside the `.env` file as `VERIFIED_ROLE_ID`.

### 8. Discord Channel ID

1. Right-click the channel where you want loggings notifications and select **Copy ID**.
2. Paste the copied ID inside the `.env` file as `LOGGING_CHANNEL_ID`.

### 9. Email Username and Password

1. You will need to provide a username and password for the bot to send emails as. The best way is to create a new email address with 2FA and a strong password.
2. Then, under [Account Security](https://myaccount.google.com/security), select **App passwords** and create a name like "Discord Bot" to generate a new app password.
3. Copy and paste the email username and app password inside the `.env` file as `EMAIL_USERNAME` and `EMAIL_APP_PASSWORD`.

### 10. Setup Database

- To initialize the user database, paste the following two commands into the terminal:

```
npx prisma db push
npx prisma generate
```

### 11. Start the Bot

- To start the bot, open a Terminal window in your project directory and run:

```
npm start
```

## Troubleshooting

- **Bot Not Responding**: Ensure the bot has the correct permissiosn to post and manage messages.
