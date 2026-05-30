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
    await Kullanici.deleteMany({});
    console.log('Eski kullanıcılar silindi.');

    const kullaniciAdi = 'AKYIL';     // ← kullanıcı adını buraya yaz
    const yeniSifre = 'akyıl123.';     // ← şifreyi buraya yaz

    const hash = await bcrypt.hash(yeniSifre, 10);
    await Kullanici.create({ kullaniciAdi, sifre: hash, rol: 'admin' });
    console.log(`${kullaniciAdi} / ${yeniSifre} ile oluşturuldu.`);

    mongoose.disconnect();
};

olustur();