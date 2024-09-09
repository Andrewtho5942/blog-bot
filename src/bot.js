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
        // if (message.attachments.size > 0) {
        //    message.attachments.forEach(async (attachment) => {
        // //if (attachment.contentType.includes('image')) {
        //     const imageData = {
        //         url: attachment.url,
        //         caption: message.content || 'No caption',
        //         timestamp: Date.now(),
        //     };

        //     // Add image data to Firebase
        //     const db = admin.firestore();
        //     await db.collection('images').add(imageData);
        //     console.log('Image uploaded to Firebase');
        // }

        console.log("picked up a blog message by: " + message.author.username)
        const messageData = {
            caption: message.content,
            link: message.content,
            timestamp: message.createdTimestamp,
        };

        // Add message data to Firebase
        const db = admin.firestore();
        await db.collection('blog').add(messageData);
        console.log('Message uploaded to Firebase');
        //  });
        //}
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);