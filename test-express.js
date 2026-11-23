import express from 'express';
const app = express();
app.get('*all', (req, res) => res.send('ok'));
app.listen(3002, () => console.log('Listening'));
