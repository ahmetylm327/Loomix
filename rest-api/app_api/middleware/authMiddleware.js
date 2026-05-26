module.exports = (req, res, next) => {
    console.log("Gelen Cookie:", req.cookies); // Loglara düşüyor mu?

    // DEBUG: Token kontrolünü geçici olarak devre dışı bırak
    // if (!req.cookies.token) return res.status(401)... (BU SATIRI GEÇİCİ SİL)

    next(); // Herkesi içeri al
};