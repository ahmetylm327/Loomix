const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const Odeme = mongoose.model('Odeme');

let PersonelHareket;
try { PersonelHareket = mongoose.model('PersonelHareket'); }
catch (error) { console.warn("Uyarı: PersonelHareket modeli henüz oluşturulmamış."); }

const personelEkle = async (req, res) => {
    try {
        const dbData = {
            adSoyad: req.body.adSoyad || req.body.fullname,
            ucretTipi: req.body.ucretTipi || 'Günlük',
            ucretMiktari: Number(req.body.ucretMiktari || 0),
            pozisyon: req.body.pozisyon || req.body.position,
            telefon: req.body.telefon || req.body.phoneNumber,
            mikroId: req.body.mikroId || req.body.mikro_id || null,
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
            adSoyad: req.body.adSoyad || req.body.fullname,
            ucretTipi: req.body.ucretTipi || 'Günlük',
            ucretMiktari: Number(req.body.ucretMiktari || 0),
            pozisyon: req.body.pozisyon || req.body.position,
            telefon: req.body.telefon || req.body.phoneNumber,
            mikroId: req.body.mikroId || req.body.mikro_id
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
        res.status(200).json({ mesaj: "Personel başarıyla silindi." });
    } catch (error) {
        res.status(400).json({ mesaj: "Personel silinemedi", detay: error.message });
    }
};

const personelOdemeYap = async (req, res) => {
    const { employeeId } = req.params;
    const tutar = Number(req.body.miktar || req.body.tutar);

    try {
        const personel = await Personel.findById(employeeId);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        if (tutar <= 0) return res.status(400).json({ mesaj: "Geçerli bir tutar girin." });

        personel.bakiye = (personel.bakiye || 0) - tutar;
        await personel.save();

        if (PersonelHareket) {
            await PersonelHareket.create({
                personelId: employeeId,
                islemTipi: 'Ödeme',
                tutar: Math.abs(tutar), // 🚀 DÜZELTME: Kasa mantığıyla aynı olması için pozitif kaydediyoruz
                bakiyeSonrasi: personel.bakiye,
                aciklama: req.body.notlar || 'Manuel Avans/Maaş Ödemesi'
            });
        }

        await Odeme.create({
            islemYonu: 'Gider',
            odemeTipi: 'Nakit/Banka',
            tutar: Math.abs(tutar),
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
            if (personel && personel.bakiye > 0) {
                const odenenTutar = personel.bakiye;
                toplamOdenen += odenenTutar;
                personel.bakiye = 0;
                await personel.save();

                if (PersonelHareket) {
                    await PersonelHareket.create({
                        personelId: id,
                        islemTipi: 'Ödeme',
                        tutar: Math.abs(odenenTutar), // 🚀 DÜZELTME: Pozitif kaydediyoruz
                        bakiyeSonrasi: 0,
                        aciklama: notlar || 'Toplu Maaş Kapatması'
                    });
                }
            }
        }

        if (toplamOdenen > 0) {
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
        if (!PersonelHareket) return res.status(500).json({ mesaj: "Hareket tablosu bulunamadı." });

        // 🚀 DÜZELTME: Sıralama 1 yapıldı (Eskiden Yeniye / Kronolojik). Banka defteri gibi akar!
        const hareketler = await PersonelHareket.find({ personelId: employeeId }).sort({ islemTarihi: -1 });
        res.status(200).json(hareketler);
    } catch (error) {
        res.status(500).json({ mesaj: "Ekstre çekilemedi", detay: error.message });
    }
};

const personelTahsilatYap = async (req, res) => {
    const { employeeId } = req.params;
    const tutar = Number(req.body.miktar || req.body.tutar);

    try {
        const personel = await Personel.findById(employeeId);
        if (!personel) return res.status(404).json({ mesaj: "Personel bulunamadı" });
        if (tutar <= 0) return res.status(400).json({ mesaj: "Geçerli bir tutar girin." });

        personel.bakiye = (personel.bakiye || 0) + tutar;
        await personel.save();

        if (PersonelHareket) {
            await PersonelHareket.create({
                personelId: employeeId,
                islemTipi: 'Avans İadesi',
                tutar: Math.abs(tutar),
                bakiyeSonrasi: personel.bakiye,
                aciklama: req.body.notlar || 'Personelden Nakit Avans İadesi Alındı'
            });
        }

        await Odeme.create({
            islemYonu: 'Gelir',
            odemeTipi: 'Nakit/Banka',
            tutar: Math.abs(tutar),
            kategori: 'Avans İadesi',
            ilgiliId: employeeId,
            odemeTarihi: new Date(),
            notlar: `${personel.adSoyad} adlı personelden avans iadesi alındı.`
        });

        res.status(200).json({ mesaj: "Avans iadesi başarıyla alındı.", bakiye: personel.bakiye });
    } catch (error) {
        res.status(500).json({ mesaj: "İşlem sırasında hata oluştu", detay: error.message });
    }
};

module.exports = { personelEkle, personelListele, personelGuncelle, personelSil, personelOdemeYap, topluMaasOde, getPersonelEkstre, personelTahsilatYap };