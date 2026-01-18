const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ status: 'ok' });
});

const server = app.listen(3002, () => {
  console.log('Test server running on port 3002');
});

server.on('error', (err) => {
  console.error('Server error:', err);
});

// Keep process alive
setInterval(() => {
  console.log('Alive...');
}, 10000);
