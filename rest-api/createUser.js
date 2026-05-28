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
    // ESKİ KULLANICILARI SİL
    await Kullanici.deleteMany({});
    console.log('Eski kullanıcılar silindi.');

    const yeniSifre = 'akyıl123'; // ← buraya istediğin şifreyi yaz
    const hash = await bcrypt.hash(yeniSifre, 10);
    await Kullanici.create({ kullaniciAdi: 'AKYIL', sifre: hash, rol: 'admin' });
    console.log(`ahmet / ${yeniSifre} ile oluşturuldu.`);

    mongoose.disconnect();
};

olustur();