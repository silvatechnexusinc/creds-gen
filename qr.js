// qr.js
const express = require("express");
const router = express.Router();
const { default: makeWASocket, useMultiFileAuthState } = require("gifted-baileys");
const qrcode = require("qrcode");

let lastQR = "";
let isScanning = false;

router.get("/debug", (req, res) => {
  res.json({
    scanning: isScanning,
    latestQR_length: lastQR.length,
    message: lastQR ? "QR READY" : "NO QR YET"
  });
});

// STREAM QR CODE AS IMAGE
router.get("/scan", async (req, res) => {
  try {
    isScanning = true;

    const { state, saveCreds } = await useMultiFileAuthState("./session");

    const sock = makeWASocket({
      printQRInTerminal: false,
      auth: state
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { qr, connection } = update;

      if (qr) {
        lastQR = qr;

        // Send as PNG stream to browser
        res.setHeader("Content-Type", "image/png");
        return qrcode.toFileStream(res, qr);
      }

      if (connection === "open") {
        console.log("CONNECTED SUCCESSFULLY!");

        isScanning = false;
        lastQR = "";

        // Auto send creds.json to your number (edit this)
        await sock.sendMessage("2547XXXXXXXX@s.whatsapp.net", {
          text: "✔ Your WhatsApp session is ready.\ncreds.json generated."
        });

        try {
          await sock.sendMessage("2547XXXXXXXX@s.whatsapp.net", {
            document: require("fs").readFileSync("./session/creds.json"),
            mimetype: "application/json",
            fileName: "creds.json"
          });
        } catch (err) {}

        return;
      }
    });

  } catch (err) {
    return res.json({ error: err.message });
  }
});

module.exports = router;
