const mongoose = require('mongoose');
const Personel = mongoose.model('Personel');

const personelEkle = async (req, res) => {
    try {
        const { mikro_id, fullname, wage_type, wage_amount, position, phoneNumber } = req.body;
        let ucretTipi = "Günlük";
        if (wage_type === "Hourly") {
            ucretTipi = "Saatlik";
        } else if (wage_type === "Daily") {
            ucretTipi = "Günlük";
        }

        const yeniPersonel = await Personel.create({
            mikroId: mikro_id || null,
            adSoyad: fullname,
            ucretTipi: ucretTipi,
            ucretMiktari: wage_amount,
            pozisyon: position,
            telefon: phoneNumber
        });
        res.status(201).json({
            empoyeeId: yeniPersonel._id,
            status: "Başarılı"
        });
    } catch (hata) {
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

module.exports = {
    personelEkle,
    personelListele,
    personelGuncelle,
    personelSil
};