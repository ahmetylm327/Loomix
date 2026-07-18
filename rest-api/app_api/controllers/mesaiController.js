const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');
const dayjs = require('dayjs');

const Personel = mongoose.model('Personel');
const PersonelHareket = mongoose.model('PersonelHareket');
const Odeme = mongoose.model('Odeme');

// 1. TOPLU TAHAKKUK (EXCEL İLE) - YENİ "MIKRO ID" EŞLEŞTİRMESİ
const mesaiYukle = async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ description: "Dosya yüklenemedi!" });
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const hamVeri = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const calismaGunleri = {};

        // 🚀 Excel'den veriyi okurken artık İsim değil, Cihaz ID'sine (PersonelNo) göre grupluyoruz.
        hamVeri.forEach(satir => {
            const cihazId = satir['Kart No']; // Excel'deki ilgili sütun başlığı (Bunu excel'e göre değiştirebilirsin)
            const isim = satir['İsim']; // Sadece ekranda log/uyarı göstermek için alıyoruz
            const tarih = satir['GirişTarihi'];

            if (cihazId && tarih) {
                const strCihazId = String(cihazId).trim();
                if (!calismaGunleri[strCihazId]) {
                    calismaGunleri[strCihazId] = { isim: isim || "Bilinmiyor", tarihler: new Set() };
                }
                calismaGunleri[strCihazId].tarihler.add(tarih);
            }
        });

        const sonuclar = { basariliTahakkuklar: [], sistemdeBulunamayanlar: [] };

        // Veritabanındaki aktif personelleri tek seferde hafızaya al (Performans için)
        const tumPersoneller = await Personel.find({ aktifMi: true });

        for (const [cihazId, detay] of Object.entries(calismaGunleri)) {
            const calisilanGunSayisi = detay.tarihler.size;

            // 🚀 EŞLEŞTİRME: Veritabanındaki 'mikroId' ile Excel'deki 'PersonelNo'yu karşılaştır.
            const personel = tumPersoneller.find(p => p.mikroId && p.mikroId === cihazId);

            if (personel) {
                const yevmiye = personel.ucretMiktari || 0;
                const toplamHakedis = calisilanGunSayisi * yevmiye;

                personel.bakiye += toplamHakedis;
                await personel.save();

                await PersonelHareket.create({
                    personelId: personel._id,
                    islemTipi: 'Hakediş',
                    tutar: toplamHakedis,
                    aciklama: `Otomatik Puantaj: ${calisilanGunSayisi} Gün`
                });

                sonuclar.basariliTahakkuklar.push({ isim: personel.adSoyad, tahakkukTutar: toplamHakedis });
            } else {
                sonuclar.sistemdeBulunamayanlar.push({ isim: detay.isim, id: cihazId, gun: calisilanGunSayisi });
            }
        }

        fs.unlinkSync(req.file.path);
        res.status(200).json({ mesaj: "Puantaj işlendi.", ozet: sonuclar });
    } catch (hata) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        res.status(500).json({ mesaj: "Dosya işleme hatası", detay: hata.message });
    }
};

// 2. MANUEL TAHAKKUK
const hakedisHesapla = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { period_type, calisilanGunManuel } = req.body;
        const personel = await Personel.findById(id);
        if (!personel) return res.status(404).json({ description: "Personel Bulunamadı" });

        let calisilanGun = calisilanGunManuel ? Number(calisilanGunManuel) : (period_type === "Aylık" ? 26 : (period_type === "Haftalık" ? 6 : 1));
        const toplamHakedis = calisilanGun * (personel.ucretMiktari || 0);
        personel.bakiye += toplamHakedis;
        await personel.save();

        await PersonelHareket.create({
            personelId: personel._id,
            islemTipi: 'Hakediş',
            tutar: toplamHakedis,
            aciklama: `Manuel Tahakkuk: ${calisilanGun} Gün`
        });
        res.status(200).json({ mesaj: "Tahakkuk eklendi.", yeni_bakiye: personel.bakiye });
    } catch (hata) {
        res.status(400).json({ description: "Hata", detay: hata.message });
    }
};

// 3. HAFTALIK ANALİZ
const haftalikAnalizGetir = async (req, res) => {
    try {
        const tarihSiniri = new Date();
        tاريخSiniri.setDate(tarihSiniri.getDate() - 14);
        const hareketler = await PersonelHareket.find({ islemTipi: 'Hakediş', islemTarihi: { $gte: tarihSiniri } }).populate('personelId', 'adSoyad aktifMi');
        const gecerliHareketler = hareketler.filter(h => h.personelId && h.personelId.aktifMi === true);
        res.status(200).json(gecerliHareketler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Analiz verisi alınamadı", detay: hata.message });
    }
};

// 4. TOPLU ÖDEME (KASA ENTEGRE + TEK KALEM KASA ÇIKIŞI + OTOMATİK GEÇİCİ PERSONEL)
const topluOdemeYap = async (req, res) => {
    try {
        const { list, paketIsmi } = req.body;

        let toplamKasaCikisi = 0;       // Kasadan çıkacak toplam para
        let islemGorenKisiSayisi = 0;   // Kaç personele işlem yapıldığının sayısı

        for (const item of list) {
            if (!item.pId || item.duzenlenenTutar <= 0) continue;

            let gercekPersonelId = item.pId;

            // 🚀 YENİ: Eğer frontend bu kişinin listede olmadığını (yeni eklendiğini) belirtmişse
            if (item.isNew) {
                // Önce bu kişiyi arka planda "Geçici" personel olarak sisteme kaydediyoruz
                const yeniPersonel = new Personel({
                    adSoyad: item.isim,
                    kayitDurumu: 'Geçici',
                    ucretTipi: 'Günlük', // Varsayılan
                    ucretMiktari: 0,
                    bakiye: 0
                });
                await yeniPersonel.save();
                
                // Frontend'in gönderdiği sahte "temp_" id'si yerine, yeni oluşturulan gerçek veritabanı ID'sini atıyoruz
                gercekPersonelId = yeniPersonel._id; 
            }

            const personel = await Personel.findById(gercekPersonelId);
            if (!personel) continue;

            // Yeni eklenen kişilerin "buHafta" (sistem hakedişi) doğal olarak 0'dır. Fark direkt yazdığın tutar olur.
            const fark = item.duzenlenenTutar - (item.buHafta || 0);

            // 1. Manuel hakediş düzenlemesi yapıldıysa (veya sıfırdan isim girildiyse) Personel ekstresine işle
            if (Math.abs(fark) > 0.01) {
                await PersonelHareket.create({
                    personelId: gercekPersonelId,
                    islemTipi: 'Hakediş',
                    tutar: fark,
                    aciklama: item.isNew ? `Manuel Ekleme: ${paketIsmi}` : `Manuel Düzenleme: ${paketIsmi}`
                });
            }

            // 2. Personelin kendi ekstresine ödemeyi düş
            await PersonelHareket.create({
                personelId: gercekPersonelId,
                islemTipi: 'Ödeme',
                tutar: -item.duzenlenenTutar,
                aciklama: paketIsmi
            });

            // 3. Personelin güncel bakiyesini veritabanına kaydet
            await Personel.findByIdAndUpdate(gercekPersonelId, {
                $inc: { bakiye: (fark - item.duzenlenenTutar) }
            });

            // Kasaya tek kalem yazdırmak için tutarı ve sayıyı havuzda topla
            toplamKasaCikisi += item.duzenlenenTutar;
            islemGorenKisiSayisi++;
        }

        // 4. ANA KASAYA TEK KALEMDE ÇIKIŞ YAP (Döngü bittikten sonra 1 kere çalışır)
        if (toplamKasaCikisi > 0) {
            await Odeme.create({
                islemYonu: 'Gider',
                odemeTipi: 'Nakit/Banka',
                tutar: toplamKasaCikisi,
                kategori: 'Personel Maaşları',
                odemeTarihi: new Date(),
                notlar: `${paketIsmi} - Toplu Personel Maaş Ödemesi (${islemGorenKisiSayisi} Kişi)`
            });
        }

        res.status(200).json({ mesaj: "Bakiye ve ödemeler güncellendi. Yeni personeller sisteme dahil edildi." });
    } catch (hata) {
        res.status(500).json({ detay: hata.message });
    }
};

// 5. ARŞİV İŞLEMLERİ
const gecmisOdemeleriGetir = async (req, res) => {
    try {
        const paketler = await PersonelHareket.aggregate([
            { $match: { islemTipi: 'Ödeme' } },
            { $group: { _id: "$aciklama", toplam: { $sum: { $abs: "$tutar" } }, tarih: { $first: "$islemTarihi" } } },
            { $sort: { tarih: -1 } }
        ]);
        res.status(200).json(paketler);
    } catch (e) { res.status(500).json({ mesaj: "Arşiv alınamadı" }); }
};

// 🚀 YENİ: Gelişmiş Silme ve Geri Alma (Rollback) Fonksiyonu
const arsivSil = async (req, res) => {
    try {
        const paketAdi = req.params.paketAdi;

        // İptal edilecek paketin ismine bağlı tüm açıklamaları bir dizide tutuyoruz
        const ilgiliAciklamalar = [
            paketAdi,
            `Manuel Düzenleme: ${paketAdi}`,
            `Manuel Ekleme: ${paketAdi}`
        ];

        // 1. Bu pakete ait TÜM hareketleri (Ödeme ve varsa manuel Hakedişler) bul
        const hareketler = await PersonelHareket.find({ aciklama: { $in: ilgiliAciklamalar } });

        // 2. Personel bakiyelerini eski haline getir (Rollback)
        for (const hareket of hareketler) {
            if (hareket.islemTipi === 'Ödeme') {
                // Ödeme iptal ediliyorsa, personelin bakiyesi (alacağı) tekrar artmalı
                // (Tutar eksi olarak kaydedildiği için Math.abs ile pozitife çevirip ekliyoruz)
                await Personel.findByIdAndUpdate(hareket.personelId, {
                    $inc: { bakiye: Math.abs(hareket.tutar) }
                });
            } else if (hareket.islemTipi === 'Hakediş') {
                // Eğer paketle beraber ekstra bir hakediş girildiyse, iptalde bu da düşmeli
                await Personel.findByIdAndUpdate(hareket.personelId, {
                    $inc: { bakiye: -Math.abs(hareket.tutar) }
                });
            }
        }

        // 3. Personel Hareketlerini tamamen sil (Personel ekstresi temizlensin)
        await PersonelHareket.deleteMany({ aciklama: { $in: ilgiliAciklamalar } });

        // 4. Kasa (Odeme) tablosundaki tek kalem çıkışı da bulup sil
        // Kasa açıklaması "Paket İsmi - Toplu Personel Maaş Ödemesi" formatındaydı.
        await Odeme.deleteMany({ notlar: { $regex: paketAdi, $options: 'i' }, kategori: 'Personel Maaşları' });

        res.status(200).json({ mesaj: "Maaş paketi başarıyla iptal edildi. Bakiyeler, ekstreler ve kasa eski haline döndü." });
    } catch (e) { 
        res.status(500).json({ mesaj: "Silme başarısız.", detay: e.message }); 
    }
};

const paketDetayGetir = async (req, res) => {
    try {
        const detaylar = await PersonelHareket.find({ islemTipi: 'Ödeme', aciklama: req.params.paketAdi }).populate('personelId', 'adSoyad');
        res.status(200).json(detaylar);
    } catch (e) { res.status(500).json({ mesaj: "Detaylar alınamadı." }); }
};

const arsivGuncelle = async (req, res) => {
    try {
        const { eskiPaketAdi, yeniListe, yeniPaketAdi } = req.body;
        await PersonelHareket.deleteMany({ islemTipi: 'Ödeme', aciklama: eskiPaketAdi });
        for (const item of yeniListe) {
            await PersonelHareket.create({ personelId: item.pId, islemTipi: 'Ödeme', tutar: -item.buHafta, aciklama: yeniPaketAdi });
        }
        res.status(200).json({ mesaj: "Arşiv güncellendi." });
    } catch (e) { res.status(500).json({ mesaj: "Güncelleme başarısız." }); }
};

module.exports = { mesaiYukle, hakedisHesapla, haftalikAnalizGetir, topluOdemeYap, gecmisOdemeleriGetir, arsivSil, paketDetayGetir, arsivGuncelle };