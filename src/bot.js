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


if (isLocal) {
    // Local environment
    console.log(__dirname)
    const serviceAccount = require(path.join(__dirname, '..', 'config', 'serviceAccountKey.json'));
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: "https://your-firebase-project.firebaseio.com"
    });
} else {
    // Initialize Firebase Admin SDK for render
    admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        databaseURL: "https://your-firebase-project.firebaseio.com"
    });
}



client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', async (message) => {
    if (message.channel.id === blogID) {

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

    }
});

client.login(process.env.DISCORD_BOT_TOKEN);