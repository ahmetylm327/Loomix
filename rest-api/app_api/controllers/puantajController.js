const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
}));

const upload = multer({ storage: multer.memoryStorage() }).single('file');

// Yardımcı Fonksiyon: "08:30" formatını dakikaya çevirir
const timeToMinutes = (timeStr) => {
    if (!timeStr || typeof timeStr !== 'string') return 0;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return (hours * 60) + minutes;
};

const puantajYukle = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ mesaj: "Dosya yükleme hatası" });
        if (!req.file) return res.status(400).json({ mesaj: "Excel dosyası bulunamadı." });

        try {
            // ⚙️ 1. Güncel Mesai Ayarlarını Veritabanından Al (Yoksa Varsayılanı Kullan)
            let settings = await Setting.findOne({ key: 'mesai_ayarlari' });
            if (!settings) {
                settings = { value: { baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30" } };
            }
            const { baslangic, bitis, molaBas, molaBit } = settings.value;

            const molaBasDakika = timeToMinutes(molaBas);
            const molaBitDakika = timeToMinutes(molaBit);
            const molaSure = molaBitDakika - molaBasDakika;

            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const excelVerisi = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            let ozet = { basariliTahakkuklar: [], sistemdeBulunamayanlar: [] };

            for (let satir of excelVerisi) {
                const personel = await Personel.findOne({ adSoyad: satir.AdSoyad, aktifMi: true });

                if (personel) {
                    const giris = timeToMinutes(satir.GirisSaati);
                    const cikis = timeToMinutes(satir.CikisSaati);

                    if (giris > 0 && cikis > giris) {
                        // 🧮 2. Toplam Süreyi Hesapla (Dakika)
                        let toplamDakika = cikis - giris;

                        // 🥪 3. Mola Kontrolü: Eğer personel mola saatlerini kapsıyorsa molayı düş
                        if (giris <= molaBasDakika && cikis >= molaBitDakika) {
                            toplamDakika -= molaSure;
                        }

                        const calismaSaati = toplamDakika / 60;
                        let gunlukHakedis = 0;

                        // 💰 4. Ücret Tipine Göre Hesaplama
                        if (personel.ucretTipi === 'Günlük') {
                            // Günlük ücreti 10 saatlik (08-19 arası mola hariç) standart mesaiye bölüyoruz
                            const saatlikUcret = personel.ucretMiktari / 10;
                            gunlukHakedis = calismaSaati * saatlikUcret;
                        } else {
                            gunlukHakedis = calismaSaati * personel.ucretMiktari;
                        }

                        personel.bakiye = (personel.bakiye || 0) + gunlukHakedis;
                        await personel.save();

                        ozet.basariliTahakkuklar.push({
                            isim: personel.adSoyad,
                            tahakkukTutar: Math.round(gunlukHakedis),
                            gun: (calismaSaati / 10).toFixed(1),
                            yeniBakiye: Math.round(personel.bakiye)
                        });
                    }
                } else {
                    ozet.sistemdeBulunamayanlar.push({ isim: satir.AdSoyad, gun: "?" });
                }
            }

            res.status(200).json({ mesaj: "Puantaj başarıyla işlendi!", ozet });

        } catch (hata) {
            res.status(500).json({ mesaj: "Sistem hatası", detay: hata.message });
        }
    });
};

// Ayarları Güncelleme Fonksiyonu
const ayarlarıGuncelle = async (req, res) => {
    try {
        await Setting.findOneAndUpdate(
            { key: 'mesai_ayarlari' },
            { value: req.body },
            { upsert: true }
        );
        res.status(200).json({ mesaj: "Mesai ayarları güncellendi!" });
    } catch (e) { res.status(500).json({ mesaj: "Hata" }); }
};

const ayarlarıGetir = async (req, res) => {
    try {
        const settings = await Setting.findOne({ key: 'mesai_ayarlari' });
        if (settings) {
            res.status(200).json(settings.value);
        } else {
            // Veritabanında yoksa varsayılanları gönder
            res.status(200).json({ baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30" });
        }
    } catch (e) {
        res.status(500).json({ mesaj: "Ayarlar çekilemedi" });
    }
};

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };