const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('./app_api/models/db');
const apiRouter = require('./app_api/routers/index');

const app = express();

app.set('trust proxy', 1);
app.use(helmet());

const izinliDomainler = [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://loomix-two.vercel.app',
    'https://loomix-frontend.vercel.app',
    'https://loomix-chr88t6rz-ahmets-projects-14439cd0.vercel.app',
    'https://loomix-3r7gs6qca-ahmets-projects-14439cd0.vercel.app'
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.endsWith('.vercel.app') || origin.includes('localhost')) {
            callback(null, true);
        } else {
            callback(new Error('CORS: Bu kaynaktan erişim yasak.'));
        }
    },
    credentials: true
}));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { mesaj: "Çok fazla giriş denemesi. 15 dakika bekleyin." }
});

const genelLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 200,
    message: { mesaj: "Çok fazla istek. Lütfen bekleyin." }
});

app.use('/api/auth/login', loginLimit);
app.use('/api', genelLimit);
app.use('/api', apiRouter);

app.use((err, req, res, next) => {
    console.error("Hata:", err.message);
    res.status(500).json({ mesaj: "Sunucu hatası oluştu." });
});

const PORT = process.env.PORT || 9000;
app.listen(PORT, () => {
    console.log(`LOOMIX Sunucusu ${PORT} portunda çalışıyor.`);
    console.log(`JWT_SECRET yüklendi mi: ${!!process.env.JWT_SECRET}`);
});