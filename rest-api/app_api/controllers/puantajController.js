const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

// 🚀 ÇÖZÜM 1: Personel modelini zorla çağır
let Personel;
try { Personel = mongoose.model('Personel'); }
catch (e) { console.warn("Personel modeli bulunamadı!"); }

// 🚀🚀 BÜYÜK ÇÖZÜM: SİNSİ HATANIN KATİLİ!
// Sistem defteri (PersonelHareket) bulamazsa diye şemayı buraya ZORLA gömdük. 
// Artık "if(PersonelHareket)" diye sormayacak, ÇAT diye yazacak!
let PersonelHareket;
try {
    PersonelHareket = mongoose.model('PersonelHareket');
} catch (error) {
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

const puantajYukle = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ mesaj: "Dosya yükleme hatası" });
        if (!req.file) return res.status(400).json({ mesaj: "Excel dosyası bulunamadı." });

        try {
            let settings;
            if (Setting) settings = await Setting.findOne({ key: 'mesai_ayarlari' });
            if (!settings) settings = { value: { baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15 } };
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
                let satir = { AdSoyad: null, GirisSaati: null, CikisSaati: null, Tarih: null, Gun: null, Tutar: null };

                for (let key in rawSatir) {
                    let temizKey = key.replace(/\s+/g, '').toLowerCase();
                    if (['adsoyad', 'adisoyadi', 'personel', 'ad', 'isim'].includes(temizKey)) satir.AdSoyad = rawSatir[key];
                    else if (temizKey.includes('giris') || temizKey.includes('giriş')) satir.GirisSaati = rawSatir[key];
                    else if (temizKey.includes('cikis') || temizKey.includes('çıkış')) satir.CikisSaati = rawSatir[key];
                    else if (temizKey.includes('tarih') || temizKey.includes('date')) satir.Tarih = rawSatir[key];
                    else if (temizKey.includes('gün') || temizKey.includes('gun')) satir.Gun = rawSatir[key];
                    else if (temizKey.includes('tutar') || temizKey.includes('hakedis') || temizKey.includes('alacak')) satir.Tutar = rawSatir[key];
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

                    const ucret = Number(personel.ucretMiktari) || 0;

                    if (satir.Tutar) {
                        let temizTutar = satir.Tutar.toString().replace(/\./g, '').replace(',', '.');
                        gunlukHakedis = Number(temizTutar) || 0;
                        aciklamaDetay = `Manuel Puantaj Tutarı İşlendi`;
                        islemGecerli = true;
                    }
                    else if (satir.Gun) {
                        let gunKatsayi = Number(satir.Gun.toString().replace(',', '.')) || 1;
                        gunlukHakedis = gunKatsayi * ucret;
                        aciklamaDetay = `${gunKatsayi} Günlük Çalışma Tahakkuku`;
                        islemGecerli = true;
                    }
                    else if (satir.GirisSaati != null && satir.CikisSaati != null) {
                        const gercekGiris = timeToMinutes(satir.GirisSaati);
                        const cikis = timeToMinutes(satir.CikisSaati);

                        if (gercekGiris > 0 && cikis > gercekGiris) {
                            let islemGorecekGiris = gercekGiris;
                            const gecikmeSuresi = gercekGiris - mesaiBaslangicDakika;
                            if (gecikmeSuresi > 0 && gecikmeSuresi <= (tolerans || 0)) islemGorecekGiris = mesaiBaslangicDakika;

                            let toplamDakika = cikis - islemGorecekGiris;
                            if (islemGorecekGiris <= molaBasDakika && cikis >= molaBitDakika) toplamDakika -= molaSure;

                            const calismaSaati = toplamDakika / 60;
                            const gunKatsayi = calismaSaati / 10;

                            if (personel.ucretTipi === 'Günlük') gunlukHakedis = gunKatsayi * ucret;
                            else if (personel.ucretTipi === 'Saatlik') gunlukHakedis = calismaSaati * ucret;
                            else gunlukHakedis = calismaSaati * (ucret / 260);

                            aciklamaDetay = `${gunKatsayi.toFixed(1)} Günlük Çalışma Tahakkuku (${satir.GirisSaati} - ${satir.CikisSaati})`;
                            islemGecerli = true;
                        }
                    }

                    // EĞER HAKEDİŞ BULUNDUYSA VE ÜCRETİ 0'DAN BÜYÜKSE İŞLE
                    if (islemGecerli && gunlukHakedis > 0) {
                        const hakedisNum = Math.round(Number(gunlukHakedis) || 0);

                        // 1. ŞİRKET İŞÇİYE BORÇLANIYOR (BAKİYE ARTAR)
                        personel.bakiye = (personel.bakiye || 0) + hakedisNum;
                        await personel.save();

                        let islemTarihiMetni = new Date().toLocaleDateString('tr-TR');
                        if (satir.Tarih) {
                            if (typeof satir.Tarih === 'number') {
                                const excelTarihi = new Date((satir.Tarih - 25569) * 86400 * 1000);
                                islemTarihiMetni = excelTarihi.toLocaleDateString('tr-TR');
                            } else {
                                islemTarihiMetni = satir.Tarih.toString();
                            }
                        }

                        // 2. O YEŞİL "TL ALACAK (HAKEDİŞ)" SATIRI KESİN OLARAK DEFTERE İNİYOR!
                        await PersonelHareket.create({
                            personelId: personel._id,
                            islemTipi: 'Hakediş',
                            tutar: hakedisNum,
                            bakiyeSonrasi: personel.bakiye,
                            aciklama: `${islemTarihiMetni} Puantajı: ${aciklamaDetay}`
                        });

                        basariliTahakkuklar.push({
                            isim: personel.adSoyad,
                            tahakkukTutar: hakedisNum,
                            yeniBakiye: personel.bakiye
                        });
                    } else {
                        eksikBasimlar.push({ isim: aranacakIsim, mesaj: "Uygun saat yok veya personelin yevmiyesi (ücreti) 0 TL girilmiş." });
                    }
                } else {
                    if (!bulunamayanlarMap[aranacakIsim]) bulunamayanlarMap[aranacakIsim] = { isim: aranacakIsim, basimSayisi: 0 };
                    bulunamayanlarMap[aranacakIsim].basimSayisi += 1;
                }
            }

            res.status(200).json({
                mesaj: "Puantaj işlemi tamamlandı ve tahakkuklar ekstreye işlendi.",
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
        else { res.status(200).json({ baslangic: "08:00", bitis: "19:00", molaBas: "12:30", molaBit: "13:30", tolerans: 15 }); }
    } catch (e) { res.status(500).json({ mesaj: "Ayarlar çekilemedi" }); }
};

module.exports = { puantajYukle, ayarlarıGuncelle, ayarlarıGetir };