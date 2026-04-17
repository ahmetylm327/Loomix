const express = require('express');
const cors = require('cors');
require('./app_api/models/db');
const apiRouter = require('./app_api/routers/index');

const app = express();

// 🛡️ Gelişmiş CORS Ayarı
app.use(cors({
    origin: function (origin, callback) {
        // Gelen her isteğe izin ver (Geliştirme aşaması için en rahatı)
        // İleride sadece belirli linkleri içeren bir dizi/array de koyabilirsin
        callback(null, true);
    },
    credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Rotaları Bağla
app.use('/api', apiRouter);

// 🚀 Render ve Local için dinamik PORT
const PORT = process.env.PORT || 9000;

app.listen(PORT, () => {
    console.log(`LOOMIX Sunucusu ${PORT} portunda başarıyla çalışıyor.`);
});