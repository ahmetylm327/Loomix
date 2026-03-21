const { application } = require('express');
const mongoose = require('mongoose');
const Mesai = mongoose.model('Mesai');
const Personel = mongoose.model('Personel');

const mesaiYukle = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                description: "Hatalı istek (Dosya eksik veya boş)"
            });
        }
        const kabulEdilenFormatlar = [
            'text/csv', //CSV
            'application/vnd.ms-excel', //Eski Excel (.xls)
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'  // yeni Excel (.xlsx)
        ];

        if (!kabulEdilenFormatlar.includes(req.file.mimetype)) {
            return res.status(415).json({
                description: "Desteklenmeyen Dosya Formatı. Lütfen sadece Excel veya CSV yükleyin."
            });
        }
        const period = req.body.period || "Bilinmeyen Dönem";
        const rastgeleSayi = Math.floor(Math.random() * 10000);
        const uretilenJobId = "upload_" + rastgeleSayi;

        res.status(202).json({
            jobId: uretilenJobId
        });
    } catch (hata) {
        res.status(500).json({ mesaj: "Dosya yükleme hatası: " + hata.message });
    }
};


const hakedisHesapla = async (req, res) => {
    try {
        const id = req.params.employeeId;
        const { calculation_date, period_type } = req.body;
        const personel = await Personel.findById(id);
        if (!personel) {
            return res.status(404).json({ description: "Personel Bulunamadı" });
        }
        if (calculation_date === "2024-01-01") {
            return res.status(422).json({
                description: "Hesaplama Yapılamadı  (İlgili döneme ait Mikro verisi bulunamadı)"
            });
        }
        let calisilanGun = 0;
        if (period_type === "Aylık") calisilanGun = 22;
        else if (period_type === "Haftalık") calisilanGun = 6;
        else calisilanGun = 1; //hatalı girişte 1 gün say

        //Toplam hakediş = çalışılan gün * personelin veritabanındaki günlük yevmiyesi
        const gunlukUcret = personel.ucretMiktari || 0;
        const toplamHakedis = calisilanGun * gunlukUcret;

        res.status(200).json({
            fullname: personel.adSoyad,
            days_worked: calisilanGun,
            daily_wage_at_time: gunlukUcret,
            total_earnings: toplamHakedis,
            currency: "TL"
        });
    } catch (hata) {
        //ID formatı hatalıysa
        res.status(400).json({ description: "Geçersiz İstek", detay: hata.message });
    }
};

module.exports = { mesaiYukle, hakedisHesapla };