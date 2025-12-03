const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require("body-parser");
const PORT = process.env.PORT || 8000;

let code = require('./pair');
let qr = require('./qr');

app.use('/code', code);
app.use('/qr', qr);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'main.html'));
});

app.get('/pair', (req, res) => {
  res.sendFile(path.join(__dirname, 'pair.html'));
});

app.get('/scan', (req, res) => {
  res.sendFile(path.join(__dirname, 'qr.html'));
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.listen(PORT, () => {
  console.log(`Silva QR + Pair Server running on ${PORT}`);
});

module.exports = app;
