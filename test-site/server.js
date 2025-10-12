const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ dest: path.join(__dirname, 'uploads') });

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/submit', upload.single('file'), (req, res) => {
  const body = { fields: req.body, file: req.file ? { originalname: req.file.originalname, path: req.file.path } : null };
  // simple persistence for POC
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', `${Date.now()}-submit.json`), JSON.stringify(body, null, 2));
  res.json({ ok: true, saved: true, body });
});

app.post('/api/log', (req, res) => {
  const body = req.body || {};
  fs.mkdirSync(path.join(__dirname, 'data'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'data', `${Date.now()}-log.json`), JSON.stringify(body, null, 2));
  res.json({ ok: true });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Test server listening on http://localhost:${port}`));
