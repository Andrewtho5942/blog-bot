require('dotenv').config();
const { Client, GatewayIntentBits  } = require('discord.js');
const admin = require('firebase-admin');

const http = require('http');

// Create a simple HTTP server to satisfy Render's port requirement
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot is running');
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

const client = new Client({
    intents: [GatewayIntentBits.Guilds,
         GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
           GatewayIntentBits.GuildMessageReactions]
  });

// Initialize Firebase Admin SDK
admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: "https://your-firebase-project.firebaseio.com"
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.attachments.size > 0) {
        message.attachments.forEach(async (attachment) => {
            if (attachment.contentType.includes('image')) {
                const imageData = {
                    url: attachment.url,
                    caption: message.content || 'No caption',
                    timestamp: Date.now(),
                };

                // Add image data to Firebase
                const db = admin.firestore();
                await db.collection('images').add(imageData);
                console.log('Image uploaded to Firebase');
            }
        });
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);