const express = require('express');
const cors = require('cors');
require('./app_api/models/db');
const apiRouter = require('./app_api/routers/index');

const app = express();

// 🛡️ CORS Ayarı (Canlıda sorun çıkmaması için)
app.use(cors());
app.use(cors({
    origin: 'https://loomix-frontend.onrender.com', // Frontend linkini buraya yaz
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