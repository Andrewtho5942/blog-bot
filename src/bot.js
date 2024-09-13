require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const admin = require("firebase-admin");
const path = require("path");
const http = require("http");
const axios = require("axios");
const sharp = require("sharp");
const Bottleneck = require("bottleneck");

// Create a simple HTTP server to keep the bot alive
const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("Bot is running");
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ],
    restRequestTimeout: 60000
});

const blogID = "1282504896171741267";

let serviceAccount = JSON.parse(
    Buffer.from(
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON,
        "base64",
    ).toString(),
);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: "gs://blog-db-3e43b.appspot.com"
});

// Use Bottleneck to control the concurrency of image processing tasks
const limiter = new Bottleneck({
    maxConcurrent: 2, // Limit to 2 concurrent image processing tasks
    minTime: 500 // Minimum time (in ms) between each task
});

// simple websocket connection to test on render
const WebSocket = require('ws');

const ws = new WebSocket('wss://gateway.discord.gg');

ws.on('open', () => {
    console.log('WebSocket connection established!');
});

ws.on('error', (err) => {
    console.error('WebSocket error:', err);
});

async function testDiscordAPI() {
    try {
        const response = await axios.get('https://discord.com/api/v10/gateway');
        console.log('Discord API response:', response.data);
    } catch (error) {
        console.error('Error connecting to Discord API:', error);
    }
}
testDiscordAPI();


client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

client.on("debug", (info) => {
    console.log(`DEBUG: ${info}`);
});

client.on("warn", (info) => {
    console.log(`WARN: ${info}`);
 });

client.on("messageCreate", async (message) => {
    if (message.channel.id === blogID) {
        // process the message text into the title and caption
        let lines = message.content.split("\n");

        let title = lines[0];
        let caption = lines.slice(1).join("\n");

        let messageData = {
            title: title || "Blog Post",
            caption: caption || "No Caption",
            links: [],
            timestamp: message.createdTimestamp,
        };

        // Get the image links for every attachment in the message
        if (message.attachments.size > 0) {
            // code to store the image on firebase cloud storage and save the link to firestore,
            // rather than using a discord link that will expire
            const imagePromises = message.attachments.map(async (attachment) => {
                return limiter.schedule(async () => {
                // Download the image from Discord's attachment link
                const response = await axios({
                    url: attachment.url,
                    responseType: "arraybuffer", // Download as binary data
                });

                // Compress the image using sharp
                const compressedImageBuffer = await sharp(response.data)
                    //.resize(800) // Resize the image (adjust the size as needed)
                    .jpeg({ quality: 80 }) // Compress the image to JPEG with 80% quality
                    .toBuffer();

                // Upload the compressed image to Firebase Storage
                const bucket = admin.storage().bucket();
                const fileName = `images/${Date.now()}-${attachment.name}`;

                const file = bucket.file(fileName);
                await file.save(compressedImageBuffer, {
                    metadata: {
                        contentType: "image/jpeg",
                    },
                });

                // Store the Firebase image link in messageData
                const [url] = await file.getSignedUrl({
                    action: "read",
                    expires: "04-20-2069",
                });
                messageData.links.push(url);
            });
        });
            await Promise.all(imagePromises);
        }

        // Add message data to Firebase
        const db = admin.firestore();
        await db.collection("blog").add(messageData);
        console.log(
            message.createdTimestamp + ": Message uploaded to Firebase",
        );

        // React to the message after uploading it to Firebase
        try {
            await message.react("📄");
            console.log("Reacted to the message");
        } catch (error) {
            console.error("Failed to react to the message:", error);
        }
    }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(console.error);
