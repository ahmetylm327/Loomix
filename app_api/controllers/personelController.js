const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');
const Cari = mongoose.model('Cari');
const Urun = mongoose.model('Urun');


const personelEkle = async (req, res) => {
    try {
        // --- MONGODB HAYALET İNDEKS TEMİZLEYİCİ ---
        try {
            await Personel.collection.dropIndexes();
            console.log("Personel indeksleri temizlendi.");
        } catch (indexError) {
            console.log("Personel indeksi temizlenemedi veya yok.");
        }
        // ------------------------------------------

        const { mikro_id, fullname, wage_type, ucretMiktari, position, phoneNumber } = req.body;

        // Frontend'den gelen wage_type'ı kontrol et
        let ucretTipi = "Günlük";
        if (wage_type === "Hourly" || wage_type === "Saatlik") {
            ucretTipi = "Saatlik";
        } else if (wage_type === "Daily" || wage_type === "Günlük") {
            ucretTipi = "Günlük";
        }

        const yeniPersonel = await Personel.create({
            mikroId: mikro_id || null, // Bu null gidebilir, sorun yok
            adSoyad: fullname,
            ucretTipi: ucretTipi,
            ucretMiktari: ucretMiktari,
            pozisyon: position,
            telefon: phoneNumber
        });
        res.status(201).json({
            empoyeeId: yeniPersonel._id,
            status: "Başarılı"
        });
    } catch (hata) {
        console.error("Personel Ekleme Hatası:", hata);
        res.status(400).json({
            mesaj: "Geçersiz Veri Girişi",
            detay: hata.message
        });
    }
};


const personelListele = async (req, res) => {
    try {
        let filtre = { aktifMi: true };

        if (req.query.position) {
            filtre.pozisyon = req.query.position;
        }
        const personeller = await Personel.find(filtre);
        const tasarımaUygunListe = personeller.map((personel) => {
            return {
                employeeId: personel._id,
                fullname: personel.adSoyad,
                position: personel.pozisyon,
                daily_wage: personel.ucretMiktari,
                balance: personel.bakiye
            };
        });
        res.status(200).json(tasarımaUygunListe);
    } catch (hata) {
        res.status(500).json({ "mesaj": "Personeller getirilemedi: " + hata.name + ": " + hata.message });
    }
};

const personelGuncelle = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const personel = await Personel.findById(id);
        if (!personel) {
            return res.status(404).json({
                error: "Girdiğiniz ID numarasına ait bir çalışan kaydı mevcut değil."
            });
        }
        const { fullname, daily_wage, position, phoneNumber } = req.body;
        if (fullname) personel.adSoyad = fullname;
        if (daily_wage) personel.ucretMiktari = daily_wage;
        if (position) personel.pozisyon = position;
        if (phoneNumber) personel.telefon = phoneNumber;

        const guncellenenPersonel = await personel.save();
        res.status(200).json({
            status: "Personel bilgileri ve iletişim numarası güncellendi.",
            updatedEmployee: {
                employeeId: guncellenenPersonel._id,
                fullname: guncellenenPersonel.adSoyad,
                phoneNumber: guncellenenPersonel.telefon,
                position: guncellenenPersonel.pozisyon,
                daily_wage: guncellenenPersonel.ucretMiktari
            }
        });
    } catch (hata) {
        res.status(400).json({
            description: "Geçersiz Veri Formatı",
            detay: hata.message
        });
    }
};

const personelSil = async (req, res) => {
    try {
        const id = req.params.employeeId;

        const personel = await Personel.findById(id);
        if (!personel) {
            return res.status(404).json({
                mesaj: "Personel Bulunamadı"
            });
        }
        personel.aktifMi = false;
        await personel.save();
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Geçersiz ID Formatı" });
    }
};

const personelOdemeYap = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { miktar } = req.body;

        if (!miktar || isNaN(miktar) || miktar <= 0) {
            return res.status(400).json({ mesaj: "Lütfen geçerli bir ödeme tutarı giriniz." });
        }

        const personel = await Personel.findById(id);
        if (!personel) {
            return res.status(404).json({ mesaj: "Personel bulunamadı." });
        }

        personel.bakiye = (personel.bakiye || 0) - Number(miktar);
        await personel.save();

        res.status(200).json({
            mesaj: `${personel.adSoyad} adlı personele ${miktar} ₺ ödeme yapıldı.`,
            kalanBakiye: personel.bakiye
        });
    } catch (hata) {
        res.status(500).json({ mesaj: "Ödeme sırasında hata oluştu", detay: hata.message });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const personelSayisi = await Personel.countDocuments({ aktifMi: true });
        const cariSayisi = await Cari.countDocuments();
        const urunSayisi = await Urun.countDocuments();

        //Toplam Borç Hesabı: Tüm personellerin bakiyeleri toplamı
        const personeller = await Personel.find({ aktifMi: true });
        const toplamBorc = personeller.reduce((toplam, p) => toplam + (p.bakiye || 0), 0);

        res.status(200).json({
            personelSayisi,
            cariSayisi,
            urunSayisi,
            toplamBorc
        });
    } catch (hata) {
        res.status(500).json({ mesaj: "İstatistikler alınamadı", hata: hata.message });
    }
};

module.exports = {
    personelEkle,
    personelListele,
    personelGuncelle,
    personelSil,
    personelOdemeYap,
    getDashboardStats
};