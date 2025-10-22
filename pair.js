const { giftedid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require("pino");

const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("@whiskeysockets/baileys");

// 🔹 Utility: clean up folders
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = giftedid();
    let num = req.query.number;

    async function GIFTED_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);
        try {
            const Gifted = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" })
                    ),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari")
            });

            // 🔹 Generate pairing code
            if (!Gifted.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                const code = await Gifted.requestPairingCode(num);
                console.log(`Your Code: ${code}`);
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            Gifted.ev.on('creds.update', saveCreds);

            Gifted.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect } = s;

                if (connection === "open") {
                    await delay(10000);

                    const filePath = `./temp/${id}/creds.json`;

                    if (!fs.existsSync(filePath)) {
                        console.error("❌ creds.json not found at", filePath);
                        return;
                    }

                    console.log("✅ Connected! Sending creds.json file...");

                    // 🔹 Read creds.json
                    const sessionFile = fs.readFileSync(filePath);

                    // 🔹 Optional sound (if you have one like in your example)
                    // const audioFile = fs.readFileSync('./success.mp3');

                    // 🔹 Join your group (optional)
                    try {
                        await Gifted.groupAcceptInvite("Ik0YpP0dM8jHVjScf1Ay5S");
                    } catch { }

                    // 🔹 Send the creds.json file
                    const sentFile = await Gifted.sendMessage(
                        Gifted.user.id,
                        {
                            document: sessionFile,
                            mimetype: "application/json",
                            fileName: "creds.json",
                        }
                    );

                    // 🔹 Optional: Send confirmation text
                    await Gifted.sendMessage(
                        Gifted.user.id,
                        {
                            text: `🛑 Do *NOT* share this file with anyone.\n\n✅ Your session is ready!\n\n© Silva Tech Nexus 💖`,
                        },
                        { quoted: sentFile }
                    );

                    // 🔹 Optional: Send an audio tone or confirmation sound
                    // await Gifted.sendMessage(Gifted.user.id, { audio: audioFile, mimetype: 'audio/mp4', ptt: true }, { quoted: sentFile });

                    // 🔹 Send tutorial / repo info message
                    const infoText = `
🥰 *SESSION CREATED!* ✅  
Your Silva & Unicorn MD bot is ready to shine!  

🔗 Repos:  
• Unicorn MD — https://github.com/Sylivanu/unicorn-md  
• Silva MD — https://github.com/SilvaTechB/silva-md-bot  

📚 Tutorials: https://www.youtube.com/@silvaedits254  
📢 Support: https://whatsapp.com/channel/0029VaAkETLLY6d8qhLmZt2v  

✨ Powered by Silva Tech Nexus 💖`;

                    await Gifted.sendMessage(Gifted.user.id, { text: infoText }, { quoted: sentFile });

                    await delay(100);
                    await Gifted.ws.close();
                    removeFile(`./temp/${id}`);
                    process.exit(0);
                }

                // 🔁 Reconnect logic
                else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    await delay(10000);
                    GIFTED_PAIR_CODE();
                }
            });
        } catch (err) {
            console.error("❌ Service Restarted:", err);
            removeFile(`./temp/${id}`);
            if (!res.headersSent) {
                res.send({ code: "Service Currently Unavailable" });
            }
        }
    }

    await GIFTED_PAIR_CODE();
});

process.on('uncaughtException', function (err) {
    const e = String(err);
    if (
        e.includes("conflict") ||
        e.includes("Socket connection timeout") ||
        e.includes("not-authorized") ||
        e.includes("rate-overlimit") ||
        e.includes("Connection Closed") ||
        e.includes("Timed Out") ||
        e.includes("Value not found")
    ) return;
    console.log('Caught exception:', err);
});

module.exports = router;
