const mongoose = require('mongoose');
const xlsx = require('xlsx');
const fs = require('fs');

const Personel = mongoose.model('Personel');

// 1. YENİ YAZDIĞIMIZ: EXCEL OKUYUCU VE TOPLU TAHAKKUK (OTOMASYON)
const mesaiYukle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ description: "Dosya yüklenemedi!" });
        }

        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const hamVeri = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

        const calismaGunleri = {};

        hamVeri.forEach(satir => {
            const isim = satir['İsim'];
            const tarih = satir['GirişTarihi'];

            if (isim && tarih) {
                const temizIsim = isim.trim();
                if (!calismaGunleri[temizIsim]) {
                    calismaGunleri[temizIsim] = new Set();
                }
                calismaGunleri[temizIsim].add(tarih);
            }
        });

        const sonuclar = {
            basariliTahakkuklar: [],
            sistemdeBulunamayanlar: []
        };

        for (const [isim, tarihlerSet] of Object.entries(calismaGunleri)) {
            const calisilanGunSayisi = tarihlerSet.size;
            const regex = new RegExp(`^${isim}$`, 'i');
            const personel = await Personel.findOne({ adSoyad: regex });

            if (personel) {
                const yevmiye = personel.ucretMiktari || 0;
                const toplamHakedis = calisilanGunSayisi * yevmiye;

                personel.bakiye += toplamHakedis;
                await personel.save();

                sonuclar.basariliTahakkuklar.push({
                    isim: personel.adSoyad,
                    gun: calisilanGunSayisi,
                    yevmiye: yevmiye,
                    tahakkukTutar: toplamHakedis,
                    yeniBakiye: personel.bakiye
                });
            } else {
                sonuclar.sistemdeBulunamayanlar.push({ isim: isim, gun: calisilanGunSayisi });
            }
        }

        fs.unlinkSync(req.file.path);

        res.status(200).json({
            mesaj: "Puantaj başarıyla işlendi ve maaşlar tahakkuk ettirildi.",
            ozet: sonuclar
        });

    } catch (hata) {
        if (req.file && req.file.path) fs.unlinkSync(req.file.path);
        console.error("🚨 Puantaj Hatası:", hata);
        res.status(500).json({ mesaj: "Dosya işleme hatası", detay: hata.message });
    }
};


// 2. DAHA ÖNCE YAZDIĞIMIZ: TEKLİ / MANUEL TAHAKKUK
const hakedisHesapla = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { calculation_date, period_type, calisilanGunManuel } = req.body;

        const personel = await Personel.findById(id);
        if (!personel) {
            return res.status(404).json({ description: "Personel Bulunamadı" });
        }

        let calisilanGun = 0;
        if (calisilanGunManuel) {
            calisilanGun = Number(calisilanGunManuel);
        } else {
            if (period_type === "Aylık") calisilanGun = 26;
            else if (period_type === "Haftalık") calisilanGun = 6;
            else calisilanGun = 1;
        }

        const gunlukUcret = personel.ucretMiktari || 0;
        const toplamHakedis = calisilanGun * gunlukUcret;

        personel.bakiye += toplamHakedis;
        await personel.save();

        res.status(200).json({
            mesaj: "Tahakkuk başarıyla eklendi ve personel bakiyesi güncellendi.",
            fullname: personel.adSoyad,
            days_worked: calisilanGun,
            daily_wage_at_time: gunlukUcret,
            total_earnings: toplamHakedis,
            yeni_bakiye: personel.bakiye,
            currency: "TL"
        });
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz İstek", detay: hata.message });
    }
};

// HER İKİ FONKSİYONU DA GÜVENLİ BİR ŞEKİLDE DIŞARI AKTARIYORUZ

const haftalikAnalizGetir = async (req, res) => {
    try {
        const birHaftaOnce = new Date();
        birHaftaOnce.setDate(birHaftaOnce.getDate() - 7);

        // Hem bu hafta hem geçen hafta olan tüm hakediş hareketlerini getir
        const hareketler = await PersonelHareket.find({
            islemTipi: 'Hakediş',
            islemTarihi: { $gte: birHaftaOnce }
        }).populate('personelId', 'adSoyad');

        res.status(200).json(hareketler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Analiz verisi alınamadı", detay: hata.message });
    }
};

const topluOdemeYap = async (req, res) => {
    try {
        const { list } = req.body; // Frontend'den gelen analiz listesi
        for (const item of list) {
            // Ödeme kaydını oluştur (negatif tutar olarak)
            await PersonelHareket.create({
                personelId: item.pId, // (Frontend'den pId bilgisini de göndermelisin)
                islemTipi: 'Ödeme',
                tutar: -item.buHafta, // Ödeme olduğu için negatif
                aciklama: `${dayjs().format('DD.MM.YYYY')} Haftalık Maaş Ödemesi`
            });
            // Personel bakiyesini güncelle
            await Personel.findByIdAndUpdate(item.pId, { $inc: { bakiye: -item.buHafta } });
        }
        res.status(200).json({ mesaj: "Ödemeler başarıyla sisteme işlendi." });
    } catch (hata) {
        res.status(500).json({ mesaj: "Ödeme işlemi başarısız." });
    }
};
module.exports = { mesaiYukle, hakedisHesapla, haftalikAnalizGetir, topluOdemeYap };