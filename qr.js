// qr.js (REAL WHATSAPP QR LOGIN)

const express = require("express");
const router = express.Router();
const fs = require("fs");
const QRCode = require("qrcode");
const pino = require("pino");
const { giftedid } = require("./id");

const {
    default: Gifted_Tech,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("gifted-baileys");

let latestQR = ""; // Base64 QR
let scanning = false;

router.get("/get", async (req, res) => {
    return res.send({ qr: latestQR });
});

router.get("/", async (req, res) => {
    if (scanning) return res.send({ status: "Already scanning..." });

    scanning = true;

    const id = giftedid();

    async function START_QR_LOGIN() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);

        try {
            const sock = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }))
                },
                printQRInTerminal: false,
                browser: Browsers.macOS("Safari"),
                logger: pino({ level: "fatal" })
            });

            sock.ev.on("creds.update", saveCreds);

            // 🔹 QR UPDATE EVENT
            sock.ev.on("connection.update", async (update) => {
                const { qr, connection, lastDisconnect } = update;

                // 🔹 Show QR to frontend
                if (qr) {
                    QRCode.toDataURL(qr, (err, url) => {
                        latestQR = url;
                    });
                }

                // 🔹 After scanning
                if (connection === "open") {
                    await delay(3000);

                    const filePath = `./temp/${id}/creds.json`;
                    if (fs.existsSync(filePath)) {
                        const creds = fs.readFileSync(filePath);

                        // Send session to owner's WhatsApp
                        await sock.sendMessage(sock.user.id, {
                            document: creds,
                            mimetype: "application/json",
                            fileName: "creds.json"
                        });
                    }

                    await sock.sendMessage(sock.user.id, {
                        text: `✅ *WhatsApp Connected via QR!*\nYour session is ready.\n© Silva Tech Nexus`
                    });

                    await delay(1000);
                    await sock.ws.close();

                    // clean up
                    fs.rmSync(`./temp/${id}`, { recursive: true, force: true });

                    latestQR = "";
                    scanning = false;

                    return;
                }

                // 🔁 If disconnected but not logged out
                if (
                    connection === "close" &&
                    lastDisconnect?.error?.output?.statusCode !== 401
                ) {
                    await delay(1500);
                    START_QR_LOGIN();
                }
            });
        } catch (err) {
            scanning = false;
            latestQR = "";
            console.log("QR ERROR:", err);
            return res.send({ status: "QR Error" });
        }
    }

    START_QR_LOGIN();

    res.send({ status: "QR Scan Started" });
});

module.exports = router;
