const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

require('events').EventEmitter.defaultMaxListeners = 500;

let pair = require('./pair');
let qr = require('./qr');

app.use('/code', pair);
app.use('/qr', qr);

// Home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Pairing code UI
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// QR UI
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
