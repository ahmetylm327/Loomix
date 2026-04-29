const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket'); // 🚀 YENİ EKLENDİ
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

            let basariliTahakkuklar = [];
            let eksikBasimlar = [];
            let bulunamayanlarMap = {};

            for (let satir of excelVerisi) {
                const personel = await Personel.findOne({ adSoyad: satir.AdSoyad, aktifMi: true });

                if (personel) {
                    if (!satir.GirisSaati || !satir.CikisSaati) {
                        let hataNedeni = "";
                        if (!satir.GirisSaati && !satir.CikisSaati) hataNedeni = "Hiç basmamış (Giriş/Çıkış Yok)";
                        else if (!satir.GirisSaati) hataNedeni = "Girişte basmayı unutmuş";
                        else if (!satir.CikisSaati) hataNedeni = "Çıkışta basmayı unutmuş";

                        eksikBasimlar.push({
                            isim: satir.AdSoyad,
                            giris: satir.GirisSaati || '-',
                            cikis: satir.CikisSaati || '-',
                            mesaj: hataNedeni
                        });
                        continue;
                    }

                    const gercekGiris = timeToMinutes(satir.GirisSaati);
                    const cikis = timeToMinutes(satir.CikisSaati);

                    let islemGorecekGiris = gercekGiris;
                    const gecikmeSuresi = gercekGiris - mesaiBaslangicDakika;

                    if (gecikmeSuresi > 0 && gecikmeSuresi <= (tolerans || 0)) {
                        islemGorecekGiris = mesaiBaslangicDakika;
                    }

                    if (islemGorecekGiris > 0 && cikis > islemGorecekGiris) {
                        let toplamDakika = cikis - islemGorecekGiris;
                        if (islemGorecekGiris <= molaBasDakika && cikis >= molaBitDakika) {
                            toplamDakika -= molaSure;
                        }

                        const calismaSaati = toplamDakika / 60;
                        let gunlukHakedis = 0;

                        if (personel.ucretTipi === 'Günlük') {
                            gunlukHakedis = calismaSaati * (personel.ucretMiktari / 10);
                        } else {
                            gunlukHakedis = calismaSaati * personel.ucretMiktari;
                        }

                        // 1. Personel bakiyesini güncelle
                        personel.bakiye = (personel.bakiye || 0) + gunlukHakedis;
                        await personel.save();

                        // 🚀 2. RAPORLAR İÇİN HAREKET KAYDI OLUŞTUR
                        await PersonelHareket.create({
                            personelId: personel._id,
                            islemTipi: 'Hakediş',
                            tutar: Math.round(gunlukHakedis),
                            bakiyeSonrasi: Math.round(personel.bakiye),
                            aciklama: `Puantaj: ${satir.GirisSaati}-${satir.CikisSaati} Çalışması`
                        });

                        basariliTahakkuklar.push({
                            isim: personel.adSoyad,
                            tahakkukTutar: Math.round(gunlukHakedis),
                            gun: (calismaSaati / 10).toFixed(1),
                            yeniBakiye: Math.round(personel.bakiye),
                            toleransUygulandiMi: gecikmeSuresi > 0 && gecikmeSuresi <= tolerans
                        });
                    }
                } else {
                    if (!bulunamayanlarMap[satir.AdSoyad]) {
                        bulunamayanlarMap[satir.AdSoyad] = { isim: satir.AdSoyad, basimSayisi: 0 };
                    }
                    bulunamayanlarMap[satir.AdSoyad].basimSayisi += 1;
                }
            }

            res.status(200).json({
                mesaj: "Puantaj başarıyla işlendi!",
                ozet: { basariliTahakkuklar, sistemdeBulunamayanlar: Object.values(bulunamayanlarMap), eksikBasimlar }
            });

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

// 🚀 EKSİK OLAN EXPORTLAR GERİ GELDİ
module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };