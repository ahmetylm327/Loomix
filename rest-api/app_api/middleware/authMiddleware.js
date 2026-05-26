const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // İstemciden (frontend) gelen 'token' bilgisini cookie üzerinden oku
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({ mesaj: "Erişim reddedildi. Lütfen giriş yapın." });
    }

    try {
        const dogrulama = jwt.verify(token, process.env.JWT_SECRET);
        req.kullanici = dogrulama; // Token içindeki bilgileri req'e ekle
        next();
    } catch (error) {
        res.status(403).json({ mesaj: "Geçersiz veya süresi dolmuş oturum." });
    }
};