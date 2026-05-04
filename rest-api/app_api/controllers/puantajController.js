const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const dayjs = require('dayjs');

let Personel;
try { Personel = mongoose.model('Personel'); }
catch (e) { console.warn("Personel modeli bulunamadı!"); }

let PersonelHareket;
try { PersonelHareket = mongoose.model('PersonelHareket'); }
catch (error) {
    const yedekHareketSemasi = new mongoose.Schema({
        personelId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personel', required: true },
        islemTarihi: { type: Date, default: Date.now },
        islemTipi: { type: String, enum: ['Hakediş', 'Ödeme', 'Avans', 'Prim', 'Avans İadesi'], required: true },
        aciklama: { type: String },
        tutar: { type: Number, required: true },
        bakiyeSonrasi: { type: Number }
    });
    PersonelHareket = mongoose.model('PersonelHareket', yedekHareketSemasi, 'personelhareketleri');
}

let Setting;
try { Setting = mongoose.model('Setting'); }
catch (error) { Setting = mongoose.model('Setting', new mongoose.Schema({ key: String, value: mongoose.Schema.Types.Mixed })); }

const upload = multer({ storage: multer.memoryStorage() }).single('file');

const timeToMinutes = (timeVal) => {
    if (timeVal == null) return 0;
    if (typeof timeVal === 'string') {
        const parts = timeVal.split(':');
        if (parts.length < 2) return 0;
        return (Number(parts[0]) * 60) + Number(parts[1]);
    }
    if (typeof timeVal === 'number') {
        return Math.round(timeVal * 24 * 60);
    }
    return 0;
};

const metinTemizle = (metin) => {
    if (!metin) return '';
    return metin.toString().toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
};

const excelTarihCevir = (val) => {
    if (!val) return new Date().toLocaleDateString('tr-TR');
    if (typeof val === 'number') {
        const date = new Date((val - 25569) * 86400 * 1000);
        return date.toLocaleDateString('tr-TR');
    }
    return val.toString();
};

const isCumartesi = (val) => {
    if (!val) return false;
    let dateObj;
    if (typeof val === 'number') {
        dateObj = new Date((val - 25569) * 86400 * 1000);
    } else {
        const parts = val.toString().split(/[./-]/);
        if (parts.length === 3) {
            dateObj = new Date(parts[2], parts[1] - 1, parts[0]);
        } else {
            dateObj = new Date(val);
        }
    }
    return dateObj.getDay() === 6;
};

const puantajYukle = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ mesaj: "Dosya yükleme hatası" });
        if (!req.file) return res.status(400).json({ mesaj: "Excel dosyası bulunamadı." });

        try {
            let settings;
            if (Setting) settings = await Setting.findOne({ key: 'mesai_ayarlari' });

            if (!settings) settings = { value: { baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15, ctesiBaslangic: "08:00", ctesiBitis: "13:00" } };

            const { baslangic, bitis, molaBas, molaBit, tolerans, ctesiBaslangic = "08:00", ctesiBitis = "13:00" } = settings.value;

            const mesaiBaslangicDakika = timeToMinutes(baslangic);
            const mesaiBitisDakika = timeToMinutes(bitis);
            const molaBasDakika = timeToMinutes(molaBas);
            const molaBitDakika = timeToMinutes(molaBit);
            const molaSure = molaBitDakika - molaBasDakika;

            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const excelVerisiRaw = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

            if (!excelVerisiRaw || excelVerisiRaw.length === 0) {
                return res.status(400).json({ mesaj: "Excel dosyasının içi boş veya sadece başlıklar var!" });
            }

            let basariliTahakkuklar = [];
            let eksikBasimlar = [];
            let bulunamayanlarMap = {};
            let islenenPersoneller = {};

            for (let rawSatir of excelVerisiRaw) {
                let satir = { AdSoyad: null, GirisSaati: null, CikisSaati: null, Tarih: null, Gun: null, Tutar: null };

                for (let key in rawSatir) {
                    if (rawSatir[key] === null) continue;
                    let temizKey = metinTemizle(key);

                    // 🚀 ÇÖZÜM BURADA: Sistemin kafası karışmasın diye "Tarih" araması, "Giriş" kelimesinin ÜSTÜNE alındı!
                    if (temizKey.includes('ad') || temizKey.includes('isim') || temizKey.includes('personel')) satir.AdSoyad = rawSatir[key];
                    else if (temizKey.includes('tarih') || temizKey.includes('date')) satir.Tarih = rawSatir[key]; // ÖNCE TARİHİ AL
                    else if (temizKey.includes('giris')) satir.GirisSaati = rawSatir[key]; // SONRA GİRİŞİ AL
                    else if (temizKey.includes('cikis')) satir.CikisSaati = rawSatir[key]; // SONRA ÇIKIŞI AL
                    else if (temizKey.includes('gun') || temizKey.includes('mesai')) satir.Gun = rawSatir[key];
                    else if (temizKey.includes('tutar') || temizKey.includes('hakedis') || temizKey.includes('alacak')) satir.Tutar = rawSatir[key];
                }

                if (!satir.AdSoyad) continue;

                const aranacakIsim = satir.AdSoyad.toString().trim();
                const satirTarihi = excelTarihCevir(satir.Tarih);
                const buCumartesiMi = isCumartesi(satir.Tarih);

                const personel = await Personel.findOne({
                    adSoyad: { $regex: new RegExp('^' + aranacakIsim + '$', 'i') },
                    aktifMi: true
                });

                if (personel) {
                    let gunlukHakedis = 0;
                    let gunKatsayi = 0;
                    let islemGecerli = false;
                    const ucret = Number(personel.ucretMiktari) || 0;

                    if (satir.Tutar) {
                        let temizTutar = satir.Tutar.toString().replace(/\./g, '').replace(',', '.');
                        gunlukHakedis = Number(temizTutar) || 0;
                        islemGecerli = true;
                    }
                    else if (satir.Gun) {
                        gunKatsayi = Number(satir.Gun.toString().replace(',', '.')) || 1;
                        gunlukHakedis = gunKatsayi * ucret;
                        islemGecerli = true;
                    }
                    else if (satir.GirisSaati != null && satir.CikisSaati != null) {
                        const gercekGiris = timeToMinutes(satir.GirisSaati);
                        const gercekCikis = timeToMinutes(satir.CikisSaati);

                        if (gercekGiris > 0 && gercekCikis > gercekGiris) {

                            const aktifBaslangic = buCumartesiMi ? timeToMinutes(ctesiBaslangic) : mesaiBaslangicDakika;
                            const aktifBitis = buCumartesiMi ? timeToMinutes(ctesiBitis) : mesaiBitisDakika;

                            let islemGorecekGiris = gercekGiris;
                            let islemGorecekCikis = gercekCikis;

                            if (gercekGiris < aktifBaslangic) islemGorecekGiris = aktifBaslangic;
                            else {
                                const gecikmeSuresi = gercekGiris - aktifBaslangic;
                                if (gecikmeSuresi <= (tolerans || 0)) islemGorecekGiris = aktifBaslangic;
                            }

                            if (gercekCikis > aktifBitis) islemGorecekCikis = aktifBitis;

                            let toplamDakika = islemGorecekCikis - islemGorecekGiris;

                            if (toplamDakika > 0) {
                                if (islemGorecekGiris <= molaBasDakika && islemGorecekCikis >= molaBitDakika) {
                                    toplamDakika -= molaSure;
                                }

                                const calismaSaati = toplamDakika / 60;

                                let gunlukHedefDakika = aktifBitis - aktifBaslangic;
                                if (aktifBaslangic <= molaBasDakika && aktifBitis >= molaBitDakika) gunlukHedefDakika -= molaSure;
                                const gunlukHedefSaat = gunlukHedefDakika / 60;

                                gunKatsayi = calismaSaati / gunlukHedefSaat;

                                if (gunKatsayi > 1) gunKatsayi = 1;

                                if (personel.ucretTipi === 'Günlük') gunlukHakedis = gunKatsayi * ucret;
                                else if (personel.ucretTipi === 'Saatlik') gunlukHakedis = calismaSaati * ucret;
                                else gunlukHakedis = gunKatsayi * ucret;

                                islemGecerli = true;
                            }
                        }
                    }

                    if (islemGecerli && gunlukHakedis > 0) {
                        if (!islenenPersoneller[personel._id]) {
                            islenenPersoneller[personel._id] = { personel: personel, toplamHakedis: 0, toplamGun: 0, tarihler: [] };
                        }
                        islenenPersoneller[personel._id].toplamHakedis += gunlukHakedis;
                        islenenPersoneller[personel._id].toplamGun += gunKatsayi;
                        islenenPersoneller[personel._id].tarihler.push(satirTarihi);
                    } else {
                        eksikBasimlar.push({
                            isim: aranacakIsim,
                            tarih: satirTarihi,
                            giris: satir.GirisSaati || '-',
                            cikis: satir.CikisSaati || '-',
                            mesaj: "Saat sınırların dışında kaldı veya maaş 0 TL."
                        });
                    }
                } else {
                    if (!bulunamayanlarMap[aranacakIsim]) bulunamayanlarMap[aranacakIsim] = { isim: aranacakIsim, basimSayisi: 0 };
                    bulunamayanlarMap[aranacakIsim].basimSayisi += 1;
                }
            }

            for (const pId in islenenPersoneller) {
                const data = islenenPersoneller[pId];
                const p = data.personel;
                const hakedisNum = Math.round(Number(data.toplamHakedis) || 0);

                p.bakiye = (p.bakiye || 0) + hakedisNum;
                await p.save();

                let islemTarihiMetni = data.tarihler[0];
                if (data.tarihler.length > 1) {
                    let ilkTarih = data.tarihler[0];
                    let sonTarih = data.tarihler[data.tarihler.length - 1];
                    if (ilkTarih !== sonTarih) islemTarihiMetni = `${ilkTarih} ile ${sonTarih}`;
                }

                const netGun = Number(data.toplamGun.toFixed(2));

                if (PersonelHareket) {
                    await PersonelHareket.create({
                        personelId: p._id,
                        islemTipi: 'Hakediş',
                        tutar: hakedisNum,
                        bakiyeSonrasi: p.bakiye,
                        aciklama: `${islemTarihiMetni} Tarihleri Arası: Toplam ${netGun} Günlük Çalışma`
                    });
                }

                basariliTahakkuklar.push({ isim: p.adSoyad, tahakkukTutar: hakedisNum, gun: netGun.toString(), yeniBakiye: p.bakiye });
            }

            res.status(200).json({
                mesaj: "Toplu puantaj işlemi tamamlandı ve tek satır halinde ekstreye yansıdı.",
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
        let settings;
        if (Setting) settings = await Setting.findOne({ key: 'mesai_ayarlari' });
        if (settings) { res.status(200).json(settings.value); }
        else { res.status(200).json({ baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15, ctesiBaslangic: "08:00", ctesiBitis: "13:00" }); }
    } catch (e) { res.status(500).json({ mesaj: "Ayarlar çekilemedi" }); }
};

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };