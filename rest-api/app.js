const express = require('express');
const cors = require('cors');
require('./app_api/models/db');
const apiRouter = require('./app_api/routers/index');

const app = express();

// 🛡️ CORS Ayarı (Sadece Vercel frontend'ine izin verir)
app.use(cors({
    origin: 'https://loomix-two.vercel.app/', // ÖRNEK: 'https://loomix-frontend-abc.vercel.app'
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rotaları Bağla
app.use('/api', apiRouter);

// 🚀 PORT Ayarı (Canlı sunucu için dinamik, local için 9000)
const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda başarıyla çalışıyor.`);
});