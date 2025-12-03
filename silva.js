// silva.js

const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

let code = require('./pair');
let qr = require('./qr');   // ⭐ NEW QR ROUTE

require('events').EventEmitter.defaultMaxListeners = 500;

// ROUTES
app.use('/code', code);
app.use('/qr', qr);  // ⭐ NEW QR API

// Serve 'main.html' as default
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

// Serve pair page
app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

// Serve QR display page
app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`
Deployment Successful!

Silva-Session-Server Running on http://localhost:` + PORT)
});

module.exports = app;
