const mongoose = require('mongoose');
const Kullanici = mongoose.model('Kullanici');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 1. KAYIT OL (REGISTER) ---
exports.kayitOl = async (req, res) => {
    try {
        const { kullaniciAdi, sifre, rol } = req.body;

        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.status(400).json({ mesaj: "Bu kullanıcı adı zaten mevcut." });

        // Şifre hashleme (10 tur şifreleme)
        const salt = await bcrypt.genSalt(10);
        const hashliSifre = await bcrypt.hash(sifre, salt);

        await Kullanici.create({
            kullaniciAdi,
            sifre: hashliSifre,
            rol: rol || 'admin'
        });

        res.status(201).json({ mesaj: "Kayıt Başarılı!" });
    } catch (hata) {
        res.status(500).json({ mesaj: "Kayıt sırasında hata oluştu: " + hata.message });
    }
};

// --- 2. GİRİŞ YAP (LOGIN) ---
exports.girisYap = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Kullanıcıyı bul
        const kullanici = await Kullanici.findOne({ kullaniciAdi: username });
        if (!kullanici) return res.status(401).json({ mesaj: "Hatalı kullanıcı adı veya şifre!" });

        // 2. Şifre Karşılaştırma
        const sifreDogruMu = await bcrypt.compare(password, kullanici.sifre);
        if (!sifreDogruMu) return res.status(401).json({ mesaj: "Hatalı kullanıcı adı veya şifre!" });

        // 3. JWT Token Üretimi
        if (!process.env.JWT_SECRET) {
            return res.status(500).json({ mesaj: "Sunucu hatası: Güvenlik anahtarı tanımlı değil." });
        }

        const token = jwt.sign(
            { id: kullanici._id, rol: kullanici.rol },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        // 4. Güvenli Cookie Ayarı (Frontend ve Backend farklı domainlerde olduğu için 'none' kullandık)
        res.cookie('token', token, {
            httpOnly: true,         // JavaScript'in token'ı okumasını engeller (XSS koruması)
            secure: true,           // Sadece HTTPS üzerinden gönderilir (Canlıda şart)
            sameSite: 'none',       // Cross-origin isteklerinde çerezin gönderilmesini sağlar
            path: '/',              // Çerezin tüm API rotalarında geçerli olmasını sağlar
            maxAge: 24 * 60 * 60 * 1000 // 24 saat
        });

        res.status(200).json({ mesaj: "Giriş başarılı", rol: kullanici.rol, token: token });

    } catch (hata) {
        res.status(500).json({ mesaj: "Sunucu hatası!" });
    }
};

// --- 3. ÇIKIŞ YAP (LOGOUT) ---
exports.cikisYap = async (req, res) => {
    // Çıkış yaparken çerezi temizle
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/'
    });
    res.status(200).json({ mesaj: "Çıkış başarılı." });
};