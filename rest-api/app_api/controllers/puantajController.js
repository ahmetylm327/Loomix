const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');
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
            const excelVerisiRaw = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            let basariliTahakkuklar = [];
            let eksikBasimlar = [];
            let bulunamayanlarMap = {};

            for (let rawSatir of excelVerisiRaw) {
                // 🚀 1. ÇELİK YELEK: EXCEL SÜTUN İSİMLERİNİ OTOMATİK DÜZELT (Boşluk/Büyük-Küçük harf affeder)
                let satir = { AdSoyad: null, GirisSaati: null, CikisSaati: null, Tarih: null };

                for (let key in rawSatir) {
                    let temizKey = key.replace(/\s+/g, '').toLowerCase(); // Örn: "Giriş Saati" -> "girişsaati"

                    if (temizKey === 'adsoyad' || temizKey === 'adisoyadi' || temizKey === 'personel') satir.AdSoyad = rawSatir[key];
                    else if (temizKey === 'girissaati' || temizKey === 'giris' || temizKey.includes('giriş')) satir.GirisSaati = rawSatir[key];
                    else if (temizKey === 'cikissaati' || temizKey === 'cikis' || temizKey.includes('çıkış')) satir.CikisSaati = rawSatir[key];
                    else if (temizKey === 'tarih' || temizKey === 'date') satir.Tarih = rawSatir[key];
                }

                if (!satir.AdSoyad) continue; // Eğer satırda isim bile yoksa bomboş satırdır, atla.

                // 🚀 2. ÇELİK YELEK: İSİM ARAMASINI GEVŞET (Ahmet Yılmaz === ahmet yılmaz )
                const aranacakIsim = satir.AdSoyad.toString().trim();
                const personel = await Personel.findOne({
                    adSoyad: { $regex: new RegExp('^' + aranacakIsim + '$', 'i') },
                    aktifMi: true
                });

                if (personel) {
                    if (!satir.GirisSaati || !satir.CikisSaati) {
                        let hataNedeni = (!satir.GirisSaati && !satir.CikisSaati) ? "Giriş/Çıkış Yok" : (!satir.GirisSaati ? "Giriş Yok" : "Çıkış Yok");
                        eksikBasimlar.push({ isim: aranacakIsim, giris: satir.GirisSaati || '-', cikis: satir.CikisSaati || '-', mesaj: hataNedeni });
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
                        const gunlukKatsayi = calismaSaati / 10;
                        let gunlukHakedis = 0;

                        if (personel.ucretTipi === 'Günlük') {
                            gunlukHakedis = gunlukKatsayi * personel.ucretMiktari;
                        } else if (personel.ucretTipi === 'Saatlik') {
                            gunlukHakedis = calismaSaati * personel.ucretMiktari;
                        } else {
                            gunlukHakedis = calismaSaati * (personel.ucretMiktari / 260);
                        }

                        // 1. Personel bakiyesini güncelle
                        personel.bakiye = Number((personel.bakiye || 0)) + Number(gunlukHakedis);
                        await personel.save();

                        // 🚀 3. TAHAKKUK FİŞİNİ EKRANA (EKSTREYE) YANSIT
                        const islemTarihiMetni = satir.Tarih || new Date().toLocaleDateString('tr-TR');
                        const resmiAciklama = `${islemTarihiMetni} Puantajı: ${gunlukKatsayi.toFixed(1)} Günlük Çalışma Tahakkuku (${satir.GirisSaati} - ${satir.CikisSaati})`;

                        await PersonelHareket.create({
                            personelId: personel._id,
                            islemTipi: 'Hakediş',
                            tutar: Number(Math.round(gunlukHakedis)),
                            bakiyeSonrasi: Number(Math.round(personel.bakiye)),
                            aciklama: resmiAciklama
                        });

                        basariliTahakkuklar.push({
                            isim: personel.adSoyad,
                            tahakkukTutar: Math.round(gunlukHakedis),
                            gun: gunlukKatsayi.toFixed(1),
                            yeniBakiye: Math.round(personel.bakiye)
                        });
                    }
                } else {
                    if (!bulunamayanlarMap[aranacakIsim]) {
                        bulunamayanlarMap[aranacakIsim] = { isim: aranacakIsim, basimSayisi: 0 };
                    }
                    bulunamayanlarMap[aranacakIsim].basimSayisi += 1;
                }
            }

            res.status(200).json({
                mesaj: "Puantaj başarıyla işlendi ve tahakkuklar deftere yazıldı!",
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

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };