// qr.js

const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');

let latestQR = ""; // stores the latest QR generated

// API: return the QR in Base64
router.get('/get', async (req, res) => {
    if (!latestQR) {
        return res.send({ qr: null });
    }
    res.send({ qr: latestQR });
});

// API: generate new QR (you trigger this externally)
router.get('/generate', async (req, res) => {
    try {
        const text = req.query.text || `Silva QR ${Date.now()}`;

        QRCode.toDataURL(text, function (err, url) {
            if (err) return res.send({ error: "Failed to generate QR" });

            latestQR = url;
            res.send({ qr: url });
        });

    } catch (e) {
        res.send({ error: "Error generating QR" });
    }
});

module.exports = router;
