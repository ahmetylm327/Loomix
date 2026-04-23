const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const Setting = mongoose.models.Setting || mongoose.model('Setting', new mongoose.Schema({
    key: { type: String, unique: true },
    value: mongoose.Schema.Types.Mixed
}));

const upload = multer({ storage: multer.memoryStorage() }).single('file');

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
            // ⚙️ 1. Ayarları Çek (Tolerans Eklendi)
            let settings = await Setting.findOne({ key: 'mesai_ayarlari' });
            if (!settings) {
                settings = { value: { baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15 } };
            }
            const { baslangic, bitis, molaBas, molaBit, tolerans } = settings.value;

            const mesaiBaslangicDakika = timeToMinutes(baslangic);
            const molaBasDakika = timeToMinutes(molaBas);
            const molaBitDakika = timeToMinutes(molaBit);
            const molaSure = molaBitDakika - molaBasDakika;

            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const excelVerisi = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            // 🚀 YENİ: eksikBasimlar dizisi eklendi
            let ozet = { basariliTahakkuklar: [], sistemdeBulunamayanlar: [], eksikBasimlar: [] };

            for (let satir of excelVerisi) {
                const personel = await Personel.findOne({ adSoyad: satir.AdSoyad, aktifMi: true });

                if (personel) {
                    // ⚠️ YENİ: Eksik Basım Kontrolü (Giriş veya Çıkış boşsa)
                    if (!satir.GirisSaati || !satir.CikisSaati) {
                        ozet.eksikBasimlar.push({
                            isim: satir.AdSoyad,
                            giris: satir.GirisSaati || '-',
                            cikis: satir.CikisSaati || '-'
                        });
                        continue; // Bu kişiyi hesaplamadan atla, diğerlerine geç
                    }

                    const gercekGiris = timeToMinutes(satir.GirisSaati);
                    const cikis = timeToMinutes(satir.CikisSaati);

                    // 🧮 YENİ: Tolerans Hesabı (Sadece geç kalanlar için)
                    let islemGorecekGiris = gercekGiris;
                    const gecikmeSuresi = gercekGiris - mesaiBaslangicDakika;

                    if (gecikmeSuresi > 0 && gecikmeSuresi <= (tolerans || 0)) {
                        islemGorecekGiris = mesaiBaslangicDakika; // Tolerans içindeyse saati 08:00'a çek
                    }

                    if (islemGorecekGiris > 0 && cikis > islemGorecekGiris) {
                        let toplamDakika = cikis - islemGorecekGiris;

                        if (islemGorecekGiris <= molaBasDakika && cikis >= molaBitDakika) {
                            toplamDakika -= molaSure;
                        }

                        const calismaSaati = toplamDakika / 60;
                        let gunlukHakedis = 0;

                        if (personel.ucretTipi === 'Günlük') {
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
                            yeniBakiye: Math.round(personel.bakiye),
                            toleransUygulandiMi: gecikmeSuresi > 0 && gecikmeSuresi <= tolerans
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
            res.status(200).json({ baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15 });
        }
    } catch (e) {
        res.status(500).json({ mesaj: "Ayarlar çekilemedi" });
    }
};

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };