const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const Odeme = mongoose.model('Odeme');

// Eğer PersonelHareket modeli henüz tanımlanmadıysa sistemi çökertmemek için güvenli çağırım
let PersonelHareket;
try {
    PersonelHareket = mongoose.model('PersonelHareket');
} catch (error) {
    console.warn("Uyarı: PersonelHareket modeli henüz oluşturulmamış. Finansal işlemler eksik çalışabilir.");
}

// -------------------------------------------------------------------
// 1. STANDART CRUD İŞLEMLERİ (Ekle, Listele, Güncelle, Sil)
// -------------------------------------------------------------------

const personelEkle = async (req, res) => {
    try {
        // Frontend'den gelen İngilizce/Farklı anahtarları veritabanı şemasına uygun hale getiriyoruz
        const dbData = {
            adSoyad: req.body.fullname || req.body.adSoyad,
            ucretTipi: req.body.wage_type === 'Daily' ? 'Günlük' : (req.body.wage_type === 'Hourly' ? 'Saatlik' : (req.body.wage_type || 'Günlük')),
            ucretMiktari: Number(req.body.daily_wage || req.body.ucretMiktari || 0),
            pozisyon: req.body.position || req.body.pozisyon,
            telefon: req.body.phoneNumber || req.body.telefon,
            mikroId: req.body.mikro_id || req.body.mikroId || null,
            bakiye: 0
        };

        const yeniPersonel = new Personel(dbData);
        await yeniPersonel.save();
        res.status(201).json(yeniPersonel);
    } catch (error) {
        res.status(400).json({ mesaj: "Personel eklenemedi", detay: error.message });
    }
};

const personelListele = async (req, res) => {
    try {
        const personeller = await Personel.find().sort({ kayitTarihi: -1 });
        res.status(200).json(personeller);
    } catch (error) {
        res.status(500).json({ mesaj: "Personel listesi alınamadı", detay: error.message });
    }
};

const personelGuncelle = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const dbData = {
            adSoyad: req.body.fullname || req.body.adSoyad,
            ucretTipi: req.body.wage_type === 'Daily' ? 'Günlük' : (req.body.wage_type === 'Hourly' ? 'Saatlik' : (req.body.wage_type || 'Günlük')),
            ucretMiktari: Number(req.body.daily_wage || req.body.ucretMiktari || 0),
            pozisyon: req.body.position || req.body.pozisyon,
            telefon: req.body.phoneNumber || req.body.telefon,
            mikroId: req.body.mikro_id || req.body.mikroId
        };

        const guncel = await Personel.findByIdAndUpdate(id, dbData, { new: true });
        if (!guncel) return res.status(404).json({ mesaj: "Personel bulunamadı" });

        res.status(200).json(guncel);
    } catch (error) {
        res.status(400).json({ mesaj: "Personel güncellenemedi", detay: error.message });
    }
};

const personelSil = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const silinen = await Personel.findByIdAndDelete(id);

        if (!silinen) return res.status(404).json({ mesaj: "Personel bulunamadı" });

        // Opsiyonel: Personel silinince hareketlerini de silebilirsin ancak finansal geçmiş 
        // tutarlılığı için hareketlerin kalması genelde daha iyidir.
        res.status(200).json({ mesaj: "Personel başarıyla silindi." });
    } catch (error) {
        res.status(400).json({ mesaj: "Personel silinemedi", detay: error.message });
    }
};

// -------------------------------------------------------------------
// 2. FİNANSAL İŞLEMLER (Bireysel Ödeme, Toplu Ödeme, Ekstre)
// -------------------------------------------------------------------

const personelOdemeYap = async (req, res) => {
    const { employeeId } = req.params;
    const tutar = Number(req.body.miktar || req.body.tutar);

    try {
        const personel = await Personel.findById(employeeId);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        if (tutar <= 0) return res.status(400).json({ mesaj: "Geçerli bir tutar girin." });

        // 1. Personel bakiyesinden düş
        personel.bakiye = (personel.bakiye || 0) - tutar;
        await personel.save();

        // 2. Hareket tablosuna yaz (Eğer model tanımlıysa)
        if (PersonelHareket) {
            await PersonelHareket.create({
                personelId: employeeId,
                islemTipi: 'Ödeme',
                tutar: -tutar,
                bakiyeSonrasi: personel.bakiye,
                aciklama: req.body.notlar || 'Manuel Avans/Maaş Ödemesi'
            });
        }

        // 3. Kasadan Gider olarak düş
        await Odeme.create({
            islemYonu: 'Gider',
            odemeTipi: 'Nakit/Banka',
            tutar: tutar,
            kategori: 'Personel Ödemesi',
            ilgiliId: employeeId,
            odemeTarihi: new Date(),
            notlar: `${personel.adSoyad} adlı personele avans/maaş ödemesi.`
        });

        res.status(200).json({ mesaj: "Ödeme başarıyla kaydedildi.", bakiye: personel.bakiye });
    } catch (error) {
        res.status(500).json({ mesaj: "Ödeme işlemi sırasında hata oluştu", detay: error.message });
    }
};

const topluMaasOde = async (req, res) => {
    const { personelIds, odemeTarihi, notlar } = req.body;

    if (!personelIds || !Array.isArray(personelIds) || personelIds.length === 0) {
        return res.status(400).json({ mesaj: "Ödeme yapılacak personeller seçilmedi." });
    }

    try {
        let toplamOdenen = 0;

        for (let id of personelIds) {
            const personel = await Personel.findById(id);

            // Sadece içeride alacağı (bakiyesi) olanlara ödeme yap
            if (personel && personel.bakiye > 0) {
                const odenenTutar = personel.bakiye;
                toplamOdenen += odenenTutar;

                // Bakiyeyi sıfırla
                personel.bakiye = 0;
                await personel.save();

                // Hareket kaydı at (-)
                if (PersonelHareket) {
                    await PersonelHareket.create({
                        personelId: id,
                        islemTipi: 'Ödeme',
                        tutar: -odenenTutar,
                        bakiyeSonrasi: 0,
                        aciklama: notlar || 'Toplu Maaş Kapatması'
                    });
                }
            }
        }

        if (toplamOdenen > 0) {
            // Toplam tutarı Kasa'ya tek kalem gider olarak yaz
            await Odeme.create({
                islemYonu: 'Gider',
                odemeTipi: 'Banka/Nakit',
                tutar: toplamOdenen,
                kategori: 'Personel Maaşları',
                odemeTarihi: odemeTarihi || new Date(),
                notlar: notlar || `${personelIds.length} personelin toplam maaş ödemesi.`
            });
            res.status(200).json({ mesaj: "Toplu ödeme başarıyla gerçekleşti!", odenen: toplamOdenen });
        } else {
            res.status(400).json({ mesaj: "Seçilen personellerin ödenecek bakiyesi bulunmuyor." });
        }

    } catch (error) {
        res.status(500).json({ mesaj: "Toplu ödeme sırasında hata oluştu", detay: error.message });
    }
};

const getPersonelEkstre = async (req, res) => {
    const { employeeId } = req.params;
    try {
        if (!PersonelHareket) {
            return res.status(500).json({ mesaj: "Personel Hareket modeli sistemde bulunamadı." });
        }

        const hareketler = await PersonelHareket.find({ personelId: employeeId })
            .sort({ islemTarihi: -1 }); // En yeniler en üstte
        res.status(200).json(hareketler);
    } catch (error) {
        res.status(500).json({ mesaj: "Ekstre çekilemedi", detay: error.message });
    }
};

module.exports = {
    personelEkle,
    personelListele,
    personelGuncelle,
    personelSil,
    personelOdemeYap,
    topluMaasOde,
    getPersonelEkstre
};