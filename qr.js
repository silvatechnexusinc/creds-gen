// qr.js
const express = require("express");
const router = express.Router();
const fs = require("fs");
const qrcode = require("qrcode");
const {
    default: makeWASocket,
    useMultiFileAuthState
} = require("gifted-baileys");

let CURRENT_QR = "";
let READY = false;

// Return QR As PNG
router.get("/scan", async (req, res) => {
    res.setHeader("Content-Type", "image/png");

    let sent = false;

    const { state, saveCreds } = await useMultiFileAuthState("./qr-session");

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false
    });

    sock.ev.on("connection.update", async (update) => {
        const { connection, qr } = update;

        if (qr && !sent) {
            CURRENT_QR = qr;
            sent = true;

            // Convert and stream QR as PNG
            return qrcode.toFileStream(res, qr);
        }

        if (connection === "open") {
            console.log("QR LOGIN SUCCESSFUL!");
            READY = true;

            // Send creds.json to your number (edit number)
            try {
                await sock.sendMessage("2547XXXXXXXX@s.whatsapp.net", {
                    document: fs.readFileSync("./qr-session/creds.json"),
                    mimetype: "application/json",
                    fileName: "creds.json"
                });
            } catch {}

            try { sock.ws.close(); } catch {}
        }
    });

    sock.ev.on("creds.update", saveCreds);
});

// Debug route
router.get("/debug", (req, res) => {
    res.json({
        scanning: !READY,
        qr_detected: CURRENT_QR.length > 0,
        current_qr_length: CURRENT_QR.length
    });
});

module.exports = router;
