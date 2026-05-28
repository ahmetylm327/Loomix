require('dotenv').config();
const mongoose = require('mongoose');

const dbURI = process.env.MONGODB_URI || process.env.MONGO_URI;
mongoose.connect(dbURI).then(() => console.log('DB bağlandı'));

const bcrypt = require('bcryptjs');

const kullaniciSema = new mongoose.Schema({
    kullaniciAdi: String,
    sifre: String,
    rol: String
}, { collection: 'kullaniciler' });

const Kullanici = mongoose.model('Kullanici', kullaniciSema);

const olustur = async () => {
    const kullanicilar = [
        { kullaniciAdi: 'ahmet', sifre: 'SifreniziYazin123', rol: 'admin' },
    ];

    for (const k of kullanicilar) {
        const varMi = await Kullanici.findOne({ kullaniciAdi: k.kullaniciAdi });
        if (varMi) {
            console.log(`${k.kullaniciAdi} zaten var, silip tekrar oluşturuluyor...`);
            await Kullanici.deleteOne({ kullaniciAdi: k.kullaniciAdi });
        }
        const hash = await bcrypt.hash(k.sifre, 10);
        await Kullanici.create({ kullaniciAdi: k.kullaniciAdi, sifre: hash, rol: k.rol });
        console.log(`${k.kullaniciAdi} oluşturuldu.`);
    }
    mongoose.disconnect();
};

olustur();