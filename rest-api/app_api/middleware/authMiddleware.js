// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Cookie içinden token'ı al
    const token = req.cookies.token;

    // EĞER COOKIE BOŞSA, HEADER'DAN DA KONTROL ET (Yedekleme)
    const headerToken = req.headers.authorization?.split(' ')[1];
    const finalToken = token || headerToken;

    if (!finalToken) {
        return res.status(401).json({ mesaj: "Erişim reddedildi. Token bulunamadı." });
    }

    try {
        const dogrulama = jwt.verify(finalToken, process.env.JWT_SECRET);
        req.kullanici = dogrulama;
        next();
    } catch (error) {
        return res.status(403).json({ mesaj: "Geçersiz token." });
    }
};