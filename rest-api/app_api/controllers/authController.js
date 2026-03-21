const mongoose = require('mongoose');
const Kullanici = mongoose.model('Kullanici');

const kayitOl = async (req, res) => {
    try {
        const yeniKullanici = await Kullanici.create(req.body);
        res.status(201).json({ mesaj: "Kullanıcı başarıyla oluşturuldu", kullanici: yeniKullanici });
    } catch (hata) {
        res.status(400).json({ mesaj: "Kayıt hatası: " + hata });
    }
};

const girisYap = async (req, res) => {
    try {
        const { username, password } = req.body;
        const kullanici = await Kullanici.findOne({
            kullaniciAdi: username,
            sifre: password
        });

        if (kullanici) {
            res.status(200).json({
                token: "abc123token"
            });
        } else {
            res.status(401).json({ mesaj: "Hatalı Kimlik Bilgileri" });
        }
    } catch (hata) {
        res.status(500).json({ "mesaj": "Sunuc hatası:  " + hata });
    }
};

module.exports = { girisYap, kayitOl };