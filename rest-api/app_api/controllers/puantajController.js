const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');

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
        const temizSaat = timeVal.replace(/[.,]/g, ':').trim();
        const parts = temizSaat.split(':');
        if (parts.length < 2) return 0;
        return (Number(parts[0]) * 60) + Number(parts[1]);
    }
    if (typeof timeVal === 'number') {
        return Math.round(timeVal * 24 * 60);
    }
    return 0;
};

// Sütun başlıklarını tanımak için kullanılan temizleme (ör: "Kart No" -> "kartno")
const metinTemizle = (metin) => {
    if (!metin) return '';
    return metin.toString().toLowerCase()
        .replace(/ı/g, 'i').replace(/ğ/g, 'g')
        .replace(/ü/g, 'u').replace(/ş/g, 's')
        .replace(/ö/g, 'o').replace(/ç/g, 'c')
        .replace(/[^a-z0-9]/g, '');
};

// 🚀 DÜZELTME: İsim KARŞILAŞTIRMASI için ayrı, Türkçe'ye duyarlı bir normalizasyon.
// metinTemizle() Türkçe harfleri TAMAMEN ASCII'ye çeviriyor (ı/İ -> i), bu da farklı
// isimleri (İrem/Irem gibi) yanlışlıkla aynı gösterebilir. İsim eşleştirmede bunun yerine
// toLocaleLowerCase('tr-TR') kullanıyoruz: bu, Türkçe İ/I/ı/i harflerini doğru şekilde
// küçük harfe çevirir (JS'in varsayılan case-insensitive regex'i bunu YANLIŞ yapıyordu -
// "YILMAZ" ile "Yılmaz" regex ile eşleşmiyordu, bu da "isim aynı olduğu halde okumuyor"
// şikayetinin asıl sebebiydi).
const isimNormallestir = (str) => {
    if (!str) return '';
    return str.toString()
        .trim()
        .replace(/\s+/g, ' ')          // Excel'den gelen çoklu/fazladan boşlukları temizle
        .toLocaleLowerCase('tr-TR');
};

// 🚀 DÜZELTME: Kart No / Personel No / Sicil No gibi cihaz kimliklerini normalize eder.
// Baştaki sıfırları temizler ("00001" -> "1") ki kullanıcı personel kaydına "1" veya
// "00001" yazmış olsun, ikisi de eşleşsin.
const idNormallestir = (val) => {
    if (val === null || val === undefined) return '';
    const temiz = val.toString().trim();
    const sifirsiz = temiz.replace(/^0+/, '');
    return sifirsiz === '' ? '0' : sifirsiz;
};

const metinTemizleKisaltmasiz = metinTemizle; // (geriye dönük uyumluluk için isim korunuyor)

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
            const gecerliTolerans = (tolerans !== undefined && tolerans !== null) ? Number(tolerans) : 15;

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

            // 🚀 DÜZELTME: Tüm aktif personeli TEK sorguda çekip iki lookup map'i
            // oluşturuyoruz (mikroId map + normalize edilmiş isim map). Böylece:
            //  1) N+1 sorgu problemi ortadan kalkıyor (580 satırlık Excel'de artık
            //     580 ayrı DB sorgusu değil, tek sorgu atılıyor).
            //  2) mikroId (Kart No) varsa ÖNCE onunla eşleştirme deneniyor - isim
            //     yazımından bağımsız, en güvenilir yöntem bu.
            //  3) İsimle eşleştirme artık Türkçe-güvenli normalize fonksiyonuyla yapılıyor.
            const tumPersoneller = Personel ? await Personel.find({ aktifMi: true }) : [];

            const mikroIdMap = {};
            const isimMap = {};
            for (const p of tumPersoneller) {
                if (p.mikroId) {
                    const key = idNormallestir(p.mikroId);
                    if (key) mikroIdMap[key] = p;
                }
                const isimKey = isimNormallestir(p.adSoyad);
                if (isimKey) isimMap[isimKey] = p;
            }

            const personelBul = (kartNo, adSoyad) => {
                if (kartNo) {
                    const key = idNormallestir(kartNo);
                    if (key && mikroIdMap[key]) return mikroIdMap[key];
                }
                if (adSoyad) {
                    const key = isimNormallestir(adSoyad);
                    if (key && isimMap[key]) return isimMap[key];
                }
                return null;
            };

            let basariliTahakkuklar = [];
            let eksikBasimlar = [];
            let bulunamayanlarMap = {};
            let islenenPersoneller = {};

            // 1. AŞAMA: EXCEL'İ OKU VE HESAPLA
            for (let rawSatir of excelVerisiRaw) {
                let satir = { AdSoyad: null, KartNo: null, GirisSaati: null, CikisSaati: null, Tarih: null, Gun: null, Tutar: null };

                for (let key in rawSatir) {
                    if (rawSatir[key] === null) continue;
                    let temizKey = metinTemizle(key);

                    // 🚀 DÜZELTME (regresyon giderildi): Kimlik sütunu olarak SADECE
                    // "Kart No", "Personel No" ve "Mikro ID" kabul ediliyor.
                    // "Sicil No" BİLEREK DIŞARIDA BIRAKILDI: bazı puantaj cihazı
                    // Excel'lerinde (senin dosyanda da doğrulandı) bu alan kişisel
                    // değil, DEPARTMAN/GRUP kodudur (örn. sadece 4-5 farklı değer,
                    // onlarca personelde tekrar eder). Bunu kimlik sanmak, aynı
                    // gruptaki TÜM personelin puantajını tek bir kişiye yazan
                    // hataya yol açıyordu.
                    // Ayrıca artık "!satir.KartNo" / "!satir.AdSoyad" koruması var:
                    // bir alan bir kez set edildikten sonra, aynı satırda sonradan
                    // gelen ve yanlışlıkla eşleşen başka bir sütun onu EZEMEZ.
                    if (!satir.KartNo && (temizKey.includes('kartno') || temizKey.includes('personelno') || temizKey.includes('mikroid'))) {
                        satir.KartNo = rawSatir[key];
                    }
                    else if (!satir.AdSoyad && (temizKey.includes('ad') || temizKey.includes('isim') || temizKey.includes('personel'))) satir.AdSoyad = rawSatir[key];
                    else if (temizKey.includes('tarih') || temizKey.includes('date')) satir.Tarih = rawSatir[key];
                    else if (temizKey.includes('giris')) satir.GirisSaati = rawSatir[key];
                    else if (temizKey.includes('cikis')) satir.CikisSaati = rawSatir[key];
                    else if (temizKey.includes('gun') || temizKey.includes('mesai')) satir.Gun = rawSatir[key];
                    else if (temizKey.includes('tutar') || temizKey.includes('hakedis') || temizKey.includes('alacak')) satir.Tutar = rawSatir[key];
                }

                if (!satir.AdSoyad && !satir.KartNo) continue;

                const aranacakIsim = satir.AdSoyad ? satir.AdSoyad.toString().trim() : '';
                const satirTarihi = excelTarihCevir(satir.Tarih);
                const buCumartesiMi = isCumartesi(satir.Tarih);

                // 🚀 DÜZELTME: regex yerine, önce Kart No sonra normalize edilmiş isim
                // ile map üzerinden arama yapılıyor.
                const personel = personelBul(satir.KartNo, aranacakIsim);

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
                                if (gecikmeSuresi <= gecerliTolerans) islemGorecekGiris = aktifBaslangic;
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
                            isim: personel.adSoyad || aranacakIsim,
                            tarih: satirTarihi,
                            giris: satir.GirisSaati || '-',
                            cikis: satir.CikisSaati || '-',
                            mesaj: "Saat sınırların dışında kaldı veya maaş 0 TL."
                        });
                    }
                } else {
                    // 🚀 DÜZELTME: Eşleşmeyen kayıtlarda hem isim hem varsa Kart No
                    // gösteriliyor, ki kullanıcı hatanın isimden mi kart no'dan mı
                    // kaynaklandığını anlayabilsin.
                    const gosterimAdi = aranacakIsim || `Kart No: ${satir.KartNo}`;
                    if (!bulunamayanlarMap[gosterimAdi]) {
                        bulunamayanlarMap[gosterimAdi] = { isim: gosterimAdi, kartNo: satir.KartNo || null, basimSayisi: 0 };
                    }
                    bulunamayanlarMap[gosterimAdi].basimSayisi += 1;
                }
            }

            // 2. AŞAMA: MÜKERRER KONTROLÜ VE VERİTABANINA YAZMA
            let zatenEklenenler = [];

            for (const pId in islenenPersoneller) {
                const data = islenenPersoneller[pId];
                const p = data.personel;
                const hakedisNum = Math.round(Number(data.toplamHakedis) || 0);
                const netGun = Number(data.toplamGun.toFixed(2));

                let islemTarihiMetni = data.tarihler[0];
                if (data.tarihler.length > 1) {
                    let ilkTarih = data.tarihler[0];
                    let sonTarih = data.tarihler[data.tarihler.length - 1];
                    if (ilkTarih !== sonTarih) islemTarihiMetni = `${ilkTarih} ile ${sonTarih}`;
                }

                const beklenenAciklama = `${islemTarihiMetni} Tarihleri Arası: Toplam ${netGun} Günlük Çalışma`;

                // KORUMA KALKANI: Bu işçiye daha önce bu fiş kesilmiş mi?
                let mukerrerKayit = false;
                if (PersonelHareket) {
                    const oncekiKayit = await PersonelHareket.findOne({
                        personelId: p._id,
                        aciklama: beklenenAciklama,
                        islemTipi: 'Hakediş'
                    });
                    if (oncekiKayit) mukerrerKayit = true;
                }

                if (mukerrerKayit) {
                    zatenEklenenler.push({
                        isim: p.adSoyad,
                        mesaj: `${islemTarihiMetni} tarihleri ZATEN KAYITLI.`
                    });
                    continue; // Çift yazmayı engeller ve sıradakine geçer
                }

                // EĞER TEMİZSE KAYDET
                p.bakiye = (p.bakiye || 0) + hakedisNum;
                await p.save();

                if (PersonelHareket) {
                    await PersonelHareket.create({
                        personelId: p._id,
                        islemTipi: 'Hakediş',
                        tutar: hakedisNum,
                        bakiyeSonrasi: p.bakiye,
                        aciklama: beklenenAciklama
                    });
                }

                basariliTahakkuklar.push({ isim: p.adSoyad, tahakkukTutar: hakedisNum, gun: netGun.toString(), yeniBakiye: p.bakiye });
            }

            res.status(200).json({
                mesaj: "Toplu puantaj işlemi tamamlandı.",
                ozet: {
                    basariliTahakkuklar,
                    sistemdeBulunamayanlar: Object.values(bulunamayanlarMap),
                    eksikBasimlar,
                    zatenEklenenler // Frontend'e bu veriyi yolladık
                }
            });

        } catch (hata) {
            console.error("PUANTAJ HESAPLAMA ESNASINDA HATA:", hata);
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
