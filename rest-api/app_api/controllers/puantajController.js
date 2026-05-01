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
            const excelVerisi = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);

            let basariliTahakkuklar = [];
            let eksikBasimlar = [];
            let bulunamayanlarMap = {};

            for (let satir of excelVerisi) {
                // Excel'deki başlıkların tam olarak 'AdSoyad', 'GirisSaati', 'CikisSaati', 'Tarih' olduğundan emin olmalısın!
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
                        const gunlukKatsayi = calismaSaati / 10;
                        let gunlukHakedis = 0;

                        if (personel.ucretTipi === 'Günlük') {
                            gunlukHakedis = gunlukKatsayi * personel.ucretMiktari;
                        } else if (personel.ucretTipi === 'Saatlik') {
                            gunlukHakedis = calismaSaati * personel.ucretMiktari;
                        } else {
                            // Aylık veya parça başı için şimdilik saatlikmiş gibi kaba bir hesap yapıyoruz
                            gunlukHakedis = calismaSaati * (personel.ucretMiktari / 260); // 26 gün * 10 saat = 260 saat
                        }

                        // 1. Personel bakiyesini güncelle (Sıfırın altına düşmesini de hesaba katarak)
                        personel.bakiye = Number((personel.bakiye || 0)) + Number(gunlukHakedis);
                        await personel.save();

                        // 🚀 2. MÜŞTERİNİN İSTEDİĞİ RESMİ TAHAKKUK AÇIKLAMASI
                        const islemTarihiMetni = satir.Tarih ? dayjs(satir.Tarih).format('DD.MM.YYYY') : new Date().toLocaleDateString('tr-TR');
                        const resmiAciklama = `${islemTarihiMetni} Puantajı: ${gunlukKatsayi.toFixed(1)} Günlük Çalışma Tahakkuku (${satir.GirisSaati} - ${satir.CikisSaati})`;

                        // 🚀 3. HAREKETİ DEFTRE İŞLE (bakiyeSonrasi tam olarak o anki güncel bakiyedir)
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