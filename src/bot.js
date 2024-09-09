
require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');
const admin = require('firebase-admin');
const path = require('path');
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

const isLocal = process.env.LOCAL_ENV === 'true';
const blogID = "1282504896171741267"

let serviceAccount = null

if (isLocal) {
    // Local environment
    console.log('local')
    let accountPath = path.join(__dirname, '..', 'config', 'serviceAccountKey.json');
    serviceAccount = require(accountPath);
} else {
    // Render (cloud) environment
    console.log('render')
    serviceAccount = JSON.parse(Buffer.from(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON, 'base64').toString());
}

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

client.on('debug', (info) => {
    console.log(`DEBUG: ${info}`);
});

client.on('warn', (info) => {
    console.log(`WARN: ${info}`);
});

client.on('shardError', error => {
    console.error('A websocket connection encountered an error:', error);
});

client.on('invalidated', () => {
    console.error('Client invalidated. Likely due to invalid token or session.');
});

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('rateLimit', (info) => {
    console.warn('Rate limit hit:', info);
});
client.on('shardDisconnect', (event, shardId) => {
    console.error(`Shard ${shardId} disconnected with reason:`, event);
});

client.on('shardReconnecting', (shardId) => {
    console.log(`Shard ${shardId} is reconnecting...`);
});

client.on('error', (error) => {
    console.error('WebSocket encountered an error:', error);
});

client.ws.on('close', (code, reason) => {
    console.error(`WebSocket closed with code ${code}: ${reason}`);
});

client.ws.on('open', () => {
    console.log('WebSocket connection opened.');
});

client.ws.on('error', (error) => {
    console.error('WebSocket error occurred:', error);
});

client.on('messageCreate', async (message) => {
    if (message.channel.id === blogID) {
        console.log('Found new message')

        // process the message text into the title and caption
        let lines = message.content.split('\n')

        let title = lines[0]
        let caption = lines.slice(1).join('\n')

        let messageData = {
            title: title || "Blog Post",
            caption: caption || "No Caption",
            links: [],
            timestamp: message.createdTimestamp,
        }

        // Get the image links for every attachment in the message
        if (message.attachments.size > 0) {
            const imagePromises = message.attachments.map(async (attachment) => {
                messageData.links.push(attachment.url);
            });

            await Promise.all(imagePromises);
        }

        // Add message data to Firebase
        const db = admin.firestore();
        await db.collection('blog').add(messageData);
        console.log(message.createdTimestamp + ': Message uploaded to Firebase');

         // React to the message after uploading it to Firebase
         try {
            await message.react('📄'); 
            console.log('Reacted to the message');
        } catch (error) {
            console.error('Failed to react to the message:', error);
        }

    }
});
client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);

const dns = require('dns');
dns.resolve('discord.com', (err) => {
    if (err) {
        console.error('DNS lookup failed for discord.com:', err);
    } else {
        console.log('DNS lookup successful');
    }
});