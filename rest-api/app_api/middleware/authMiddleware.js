const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        let token = req.cookies.token;

        if (!token) {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.split(' ')[1];
            }
        }

        if (!token) {
            return res.status(401).json({ mesaj: "Oturum bulunamadı. Lütfen giriş yapın." });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.kullanici = decoded;
        next();

    } catch (hata) {
        return res.status(401).json({ mesaj: "Geçersiz veya süresi dolmuş oturum." });
    }
};