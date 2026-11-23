const express = require('express');
const app = express();
try {
  app.get('*', (req, res) => res.send('ok'));
  console.log('Success');
} catch (e) {
  console.error('Crash:', e.message);
}
