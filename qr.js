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

let latestQR = "";
let scanning = false;

router.get("/debug", (req, res) => {
    res.send({
        scanning,
        latestQR_length: latestQR.length,
        message: latestQR ? "QR AVAILABLE" : "NO QR YET"
    });
});

router.get("/get", async (req, res) => {
    res.send({ qr: latestQR });
});

router.get("/", async (req, res) => {
    console.log("🔥 /qr request received");

    if (scanning) {
        console.log("Already scanning...");
        return res.send({ status: "Already scanning..." });
    }

    scanning = true;

    const id = giftedid();
    console.log("🆔 SESSION:", id);

    async function START_QR() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${id}`);

        try {
            const sock = Gifted_Tech({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" })
                    )
                },
                browser: Browsers.macOS("Safari"),
                printQRInTerminal: true,
                logger: pino({ level: "fatal" })
            });

            sock.ev.on("creds.update", saveCreds);

            sock.ev.on("connection.update", async (update) => {
                console.log("🔄 update:", update);

                const { qr, connection } = update;

                // QR received
                if (qr) {
                    console.log("📸 QR RECEIVED!");
                    QRCode.toDataURL(qr, (err, url) => {
                        latestQR = url;
                        console.log("✅ QR STORED (base64 length:", latestQR.length, ")");
                    });
                }

                // Connected after QR scan
                if (connection === "open") {
                    console.log("🎉 WhatsApp connected!");

                    await delay(1500);

                    try {
                        const creds = fs.readFileSync(`./temp/${id}/creds.json`);

                        await sock.sendMessage(sock.user.id, {
                            document: creds,
                            mimetype: "application/json",
                            fileName: "creds.json"
                        });

                        await sock.sendMessage(sock.user.id, {
                            text: "Your QR session is ready!"
                        });
                    } catch (err) {
                        console.log("❌ Could not send creds:", err);
                    }

                    await sock.ws.close();
                    fs.rmSync(`./temp/${id}`, { recursive: true, force: true });

                    latestQR = "";
                    scanning = false;

                    console.log("🧹 Cleaned session");
                }
            });
        } catch (err) {
            console.log("❌ QR ERROR:", err);
            latestQR = "";
            scanning = false;
        }
    }

    START_QR();

    res.send({ status: "QR Scan Started" });
});

module.exports = router;
