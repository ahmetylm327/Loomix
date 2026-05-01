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

// 🚀 ÇELİK YELEK 1: Excel'den gelen bozuk ondalık saat formatlarını düzeltir
const timeToMinutes = (timeVal) => {
    if (timeVal == null) return 0;
    if (typeof timeVal === 'string') {
        const parts = timeVal.split(':');
        if (parts.length < 2) return 0;
        return (Number(parts[0]) * 60) + Number(parts[1]);
    }
    // Eğer Excel saatleri gizli ondalık sayıysa (örn: 0.3333 -> 08:00)
    if (typeof timeVal === 'number') {
        return Math.round(timeVal * 24 * 60);
    }
    return 0;
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
                // 🚀 ÇELİK YELEK 2: Sütun isimleri farklı da olsa otomatik bulur
                let satir = { AdSoyad: null, GirisSaati: null, CikisSaati: null, Tarih: null, Gun: null, Tutar: null };

                for (let key in rawSatir) {
                    let temizKey = key.replace(/\s+/g, '').toLowerCase();
                    if (temizKey === 'adsoyad' || temizKey === 'adisoyadi' || temizKey === 'personel') satir.AdSoyad = rawSatir[key];
                    else if (temizKey === 'girissaati' || temizKey === 'giris' || temizKey.includes('giriş')) satir.GirisSaati = rawSatir[key];
                    else if (temizKey === 'cikissaati' || temizKey === 'cikis' || temizKey.includes('çıkış')) satir.CikisSaati = rawSatir[key];
                    else if (temizKey === 'tarih' || temizKey === 'date') satir.Tarih = rawSatir[key];
                    else if (temizKey === 'gün' || temizKey === 'gun' || temizKey === 'gunsayisi') satir.Gun = rawSatir[key];
                    else if (temizKey === 'tutar' || temizKey === 'hakedis' || temizKey === 'alacak') satir.Tutar = rawSatir[key];
                }

                if (!satir.AdSoyad) continue;

                const aranacakIsim = satir.AdSoyad.toString().trim();
                const personel = await Personel.findOne({
                    adSoyad: { $regex: new RegExp('^' + aranacakIsim + '$', 'i') },
                    aktifMi: true
                });

                if (personel) {
                    let gunlukHakedis = 0;
                    let aciklamaDetay = "";
                    let islemGecerli = false;

                    // SENARYO A: Excel'de sadece "Tutar" girilmişse
                    if (satir.Tutar) {
                        gunlukHakedis = Number(satir.Tutar);
                        aciklamaDetay = `Manuel Puantaj Tutarı İşlendi`;
                        islemGecerli = true;
                    }
                    // SENARYO B: Excel'de sadece "Gün" girilmişse
                    else if (satir.Gun) {
                        const gunKatsayi = Number(satir.Gun);
                        gunlukHakedis = gunKatsayi * personel.ucretMiktari;
                        aciklamaDetay = `${gunKatsayi} Günlük Çalışma Tahakkuku`;
                        islemGecerli = true;
                    }
                    // SENARYO C: Excel'de detaylı "Giriş" ve "Çıkış" saatleri varsa
                    else if (satir.GirisSaati != null && satir.CikisSaati != null) {
                        const gercekGiris = timeToMinutes(satir.GirisSaati);
                        const cikis = timeToMinutes(satir.CikisSaati);

                        if (gercekGiris > 0 && cikis > gercekGiris) {
                            let islemGorecekGiris = gercekGiris;
                            const gecikmeSuresi = gercekGiris - mesaiBaslangicDakika;

                            if (gecikmeSuresi > 0 && gecikmeSuresi <= (tolerans || 0)) {
                                islemGorecekGiris = mesaiBaslangicDakika;
                            }

                            let toplamDakika = cikis - islemGorecekGiris;
                            if (islemGorecekGiris <= molaBasDakika && cikis >= molaBitDakika) {
                                toplamDakika -= molaSure;
                            }

                            const calismaSaati = toplamDakika / 60;
                            const gunKatsayi = calismaSaati / 10;

                            if (personel.ucretTipi === 'Günlük') {
                                gunlukHakedis = gunKatsayi * personel.ucretMiktari;
                            } else if (personel.ucretTipi === 'Saatlik') {
                                gunlukHakedis = calismaSaati * personel.ucretMiktari;
                            } else {
                                gunlukHakedis = calismaSaati * (personel.ucretMiktari / 260);
                            }
                            aciklamaDetay = `${gunKatsayi.toFixed(1)} Günlük Çalışma Tahakkuku`;
                            islemGecerli = true;
                        }
                    }

                    // 🚀 EĞER HERHANGİ BİR ÇALIŞMA VERİSİ BULUNDUYSA ALACAK YAZ!
                    if (islemGecerli) {
                        // 1. ŞİRKET İŞÇİYE BORÇLANIYOR (Bakiyeyi artır)
                        personel.bakiye = Number((personel.bakiye || 0)) + Number(gunlukHakedis);
                        await personel.save();

                        // Excel Tarih düzeltmesi
                        let islemTarihiMetni = new Date().toLocaleDateString('tr-TR');
                        if (satir.Tarih) {
                            if (typeof satir.Tarih === 'number') {
                                const excelTarihi = new Date((satir.Tarih - 25569) * 86400 * 1000);
                                islemTarihiMetni = excelTarihi.toLocaleDateString('tr-TR');
                            } else {
                                islemTarihiMetni = satir.Tarih.toString();
                            }
                        }

                        // 2. EKSTREDE GÖZÜKECEK OLAN O YEŞİL "ALACAK (HAKEDİŞ)" SATIRINI OLUŞTUR
                        await PersonelHareket.create({
                            personelId: personel._id,
                            islemTipi: 'Hakediş', // Raporlama bunu yeşil Alacak sütununa atar
                            tutar: Number(Math.round(gunlukHakedis)),
                            bakiyeSonrasi: Number(Math.round(personel.bakiye)),
                            aciklama: `${islemTarihiMetni} Puantajı: ${aciklamaDetay}`
                        });

                        basariliTahakkuklar.push({
                            isim: personel.adSoyad,
                            tahakkukTutar: Math.round(gunlukHakedis),
                            yeniBakiye: Math.round(personel.bakiye)
                        });
                    } else {
                        eksikBasimlar.push({
                            isim: aranacakIsim,
                            mesaj: "Uygun saat, gün veya tutar verisi bulunamadı."
                        });
                    }
                } else {
                    if (!bulunamayanlarMap[aranacakIsim]) bulunamayanlarMap[aranacakIsim] = { isim: aranacakIsim, basimSayisi: 0 };
                    bulunamayanlarMap[aranacakIsim].basimSayisi += 1;
                }
            }

            res.status(200).json({
                mesaj: "Puantaj tahakkukları ALACAK olarak deftere işlendi!",
                ozet: { basariliTahakkuklar, sistemdeBulunamayanlar: Object.values(bulunamayanlarMap), eksikBasimlar }
            });

        } catch (hata) {
            res.status(500).json({ mesaj: "Sistem hatası", detay: hata.message });
        }
    });
};

const ayarlarıGuncelle = async (req, res) => {
    try {
        await Setting.findOneAndUpdate({ key: 'mesai_ayarlari' }, { value: req.body }, { upsert: true });
        res.status(200).json({ mesaj: "Mesai ayarları güncellendi!" });
    } catch (e) { res.status(500).json({ mesaj: "Hata" }); }
};

const ayarlarıGetir = async (req, res) => {
    try {
        const settings = await Setting.findOne({ key: 'mesai_ayarlari' });
        if (settings) { res.status(200).json(settings.value); }
        else { res.status(200).json({ baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15 }); }
    } catch (e) { res.status(500).json({ mesaj: "Ayarlar çekilemedi" }); }
};

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };