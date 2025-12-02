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
} = require("gifted-baileys");

// 🔹 Clean folder
function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
}

router.get('/', async (req, res) => {
    const id = giftedid();

    // Serve qr.html with session id
    res.send(`
        <html>
        <head><title>QR Login</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;background:#f3f3f3;">
            <div>
                <h2 style="text-align:center;">Scan QR to Connect WhatsApp</h2>
                <img id="qr" style="width:300px;border:1px solid #333" />
            </div>

            <script>
                const eventSource = new EventSource('/qr/scan?id=${id}');
                eventSource.onmessage = (e) => {
                    document.getElementById('qr').src = e.data;
                };
            </script>
        </body>
        </html>
    `);
});

// 🔹 QR Event Stream
router.get('/scan', async (req, res) => {
    const id = req.query.id;

    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    async function START_QR() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);

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

        Gifted.ev.on('creds.update', saveCreds);

        // 🔹 Generate and send QR repeatedly
        Gifted.ev.on("connection.update", async (update) => {
            const { qr, connection } = update;

            if (qr) {
                res.write(`data: ${JSON.stringify(qr)}\n\n`);
            }

            if (connection === "open") {
                await delay(8000);

                const filePath = `./temp/${id}/creds.json`;
                if (!fs.existsSync(filePath)) return;

                console.log("✅ Connected via QR");

                const sessionFile = fs.readFileSync(filePath);

                try { await Gifted.groupAcceptInvite("Ik0YpP0dM8jHVjScf1Ay5S"); } catch { }

                const sentFile = await Gifted.sendMessage(Gifted.user.id, {
                    document: sessionFile,
                    mimetype: "application/json",
                    fileName: "creds.json",
                });

                await Gifted.sendMessage(
                    Gifted.user.id,
                    { text: `✨ Session Created Successfully! Do not share this file.` },
                    { quoted: sentFile }
                );

                await Gifted.sendMessage(
                    Gifted.user.id,
                    {
                        text: `
🥰 *SESSION CREATED!*  
Your Silva / Unicorn bot is ready!

Repos:
• Unicorn MD — https://github.com/Sylivanu/unicorn-md
• Silva MD — https://github.com/SilvaTechB/silva-md-bot

Tutorials: https://www.youtube.com/@silvaedits254
Support: https://whatsapp.com/channel/0029VaAkETLLY6d8qhLmZt2v
`
                    },
                    { quoted: sentFile }
                );

                await delay(300);
                await Gifted.ws.close();
                removeFile(`./temp/${id}`);
                process.exit(0);
            }
        });
    }

    START_QR();
});

module.exports = router;
