const mongoose = require('mongoose');
const Urun = mongoose.model('Urun');
const redis = require('redis');
const amqp = require('amqplib'); // 🚀 RABBITMQ KÜTÜPHANESİ

// --- REDIS BAĞLANTISI ---
const redisClient = redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
});
redisClient.on('error', (err) => console.log('Redis Client Hatası', err));
redisClient.connect().catch(console.error);

// --- RABBITMQ YARDIMCI FONKSİYONU ---
// İşlemi yavaşlatmaması için tamamen asenkron (arka planda) çalışır
const rabbitmqMesajGonder = async (kuyrukAdi, mesaj) => {
    try {
        const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
        const channel = await connection.createChannel();
        await channel.assertQueue(kuyrukAdi, { durable: false });

        channel.sendToQueue(kuyrukAdi, Buffer.from(JSON.stringify(mesaj)));
        console.log(`🐇 RabbitMQ Kuyruğuna Mesaj Atıldı [${kuyrukAdi}]:`, mesaj);

        // Mesaj gittikten sonra kanalı kapat
        setTimeout(() => { connection.close(); }, 500);
    } catch (err) {
        console.error("RabbitMQ Bağlantı Hatası (Sistemi durdurmaz, sadece loglanmaz):", err.message);
    }
};

const urunleriListele = async (req, res) => {
    try {
        // 1. ADIM (REDIS): Önbellekte var mı?
        const cacheVerisi = await redisClient.get('urunler_listesi');
        if (cacheVerisi) {
            console.log("⚡ Ürünler REDIS önbelleğinden getirildi!");
            return res.status(200).json(JSON.parse(cacheVerisi));
        }

        const urunler = await Urun.find().populate('cariId', 'firmaAdi').sort({ createdAt: -1 });

        // Önbellekte yoksa kaydet
        await redisClient.setEx('urunler_listesi', 3600, JSON.stringify(urunler));

        res.status(200).json(urunler);
    } catch (hata) {
        res.status(500).json({ "mesaj": "Ürünler getirilemedi: " + hata.message });
    }
};

const urunEkle = async (req, res) => {
    try {
        console.log("Gelen Yeni Ürün Verisi:", req.body);

        if (!req.body.urunAdi || !req.body.birimFiyat || !req.body.cariId) {
            return res.status(400).json({ "description": "İsim, Fiyat veya Cari ID eksik!" });
        }

        const yeniUrunData = {
            stokKodu: req.body.stokKodu,
            barkod: req.body.barkod || "Barkodsuz",
            urunAdi: req.body.urunAdi,
            birimFiyat: req.body.birimFiyat,
            kdvOrani: req.body.kdvOrani || 10,
            birim: req.body.birim || 'Adet',
            cariId: new mongoose.Types.ObjectId(req.body.cariId),
            zorlukDerecesi: req.body.zorlukDerecesi || 1,
            aktifMi: req.body.aktifMi !== undefined ? req.body.aktifMi : true
        };

        const urun = await Urun.create(yeniUrunData);

        // 🧹 1. SİSTEM (REDIS CACHE INVALIDATION): Liste güncellendi, önbelleği temizle
        await redisClient.del('urunler_listesi');

        // 🐇 2. SİSTEM (RABBITMQ ASENKRON MESAJ): Yeni ürün eklendiğini arka plan kuyruğuna bildir
        rabbitmqMesajGonder('yeni_urun_kuyrugu', {
            islem: "YENI_URUN_EKLENDI",
            stokKodu: urun.stokKodu,
            urunAdi: urun.urunAdi,
            tarih: new Date()
        });

        res.status(201).json(urun);
    } catch (error) {
        console.error("🚨 Ürün Kayıt Hatası:", error.message);
        if (error.code === 11000) {
            return res.status(400).json({ "description": "Bu Stok Kodu sistemde zaten kayıtlı!" });
        }
        res.status(400).json({ "description": "Kayıt hatası: " + error.message });
    }
};

const urunGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUrun = await Urun.findByIdAndUpdate(id, req.body, { returnDocument: 'after' }).populate('cariId', 'firmaAdi');

        if (!guncelUrun) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        }

        // 🧹 REDIS TEMİZLİĞİ
        await redisClient.del('urunler_listesi');

        res.status(200).json(guncelUrun);
    } catch (hata) {
        res.status(400).json({ mesaj: "Ürün güncellenemedi", detay: hata.message });
    }
};

const urunSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenUrun = await Urun.findByIdAndDelete(id);

        if (!silinenUrun) {
            return res.status(404).json({ mesaj: "Ürün bulunamadı." });
        }

        // 🧹 REDIS TEMİZLİĞİ
        await redisClient.del('urunler_listesi');

        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Ürün silinemedi", detay: hata.message });
    }
};

module.exports = {
    urunleriListele,
    urunEkle,
    urunGuncelle,
    urunSil
};