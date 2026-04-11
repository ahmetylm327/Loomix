const mongoose = require('mongoose');
const Kullanici = mongoose.model('Kullanici');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// --- 1. KAYIT OL (REGISTER) ---
exports.kayitOl = async (req, res) => {
    try {
        const { kullaniciAdi, sifre, rol } = req.body;

        // Kullanıcı adı kontrolü
        const varMi = await Kullanici.findOne({ kullaniciAdi });
        if (varMi) return res.status(400).json({ mesaj: "Bu kullanıcı adı zaten mevcut." });

        // 🛡️ ŞİFRE HASHLEME: DB'de şifreler okunamaz olsun
        const salt = await bcrypt.genSalt(10);
        const hashliSifre = await bcrypt.hash(sifre, salt);

        const yeniKullanici = await Kullanici.create({
            kullaniciAdi,
            sifre: hashliSifre,
            rol: rol || 'admin'
        });

        res.status(201).json({ mesaj: "Kayıt Başarılı!", id: yeniKullanici._id });
    } catch (hata) {
        res.status(400).json({ mesaj: "Kayıt hatası: " + hata.message });
    }
};

// --- 2. GİRİŞ YAP (LOGIN) ---
exports.girisYap = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 👑 PATRON KİLİDİ: Veritabanına bakmadan direkt kapıyı açar
        if (username === 'ahmet' && password === 'patron123') {
            const token = jwt.sign({ id: 'patron', username: 'ahmet' }, process.env.JWT_SECRET || 'LOOMIX_SECRET', { expiresIn: '24h' });
            return res.status(200).json({ token, mesaj: "Hoş geldin patron!" });
        }

        // Normal Kullanıcı Sorgusu
        const kullanici = await Kullanici.findOne({ kullaniciAdi: username });
        if (!kullanici) return res.status(401).json({ mesaj: "Kullanıcı bulunamadı!" });

        // Şifre Karşılaştırma
        const sifreDogruMu = await bcrypt.compare(password, kullanici.sifre);
        if (!sifreDogruMu) return res.status(401).json({ mesaj: "Hatalı şifre!" });

        // JWT Token Üretimi
        const token = jwt.sign({ id: kullanici._id }, process.env.JWT_SECRET || 'LOOMIX_SECRET', { expiresIn: '24h' });
        res.status(200).json({ token });

    } catch (hata) {
        res.status(500).json({ mesaj: "Sunucu hatası!" });
    }
};