const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// --- CONTROLLER BAĞLANTILARI ---
const ctrlPersonel = require('../controllers/personelController');
const ctrlMesai = require('../controllers/mesaiController');
const ctrlAuth = require('../controllers/authController');
const ctrlCari = require('../controllers/cariController');
const ctrlUrun = require('../controllers/urunController');
const ctrlUretim = require('../controllers/uretimController');
const ctrlOdeme = require('../controllers/odemeController');
const ctrlRapor = require('../controllers/raporController');
const ctrlTahmin = require('../controllers/tahminController');
const ctrlPuantaj = require('../controllers/puantajController');
const ctrlStats = require('../controllers/statsController');

// ==========================================
// ROTALAR (FRONTEND İLE UYUMLU TÜRKÇE İSİMLER)
// ==========================================

// --- PERSONEL YÖNETİMİ ---
router.post('/personeller', ctrlPersonel.personelEkle);
router.get('/personeller', ctrlPersonel.personelListele);
router.put('/personeller/:employeeId', ctrlPersonel.personelGuncelle);
router.delete('/personeller/:employeeId', ctrlPersonel.personelSil);
router.post('/personeller/:employeeId/pay', ctrlPersonel.personelOdemeYap);

// --- ÜRETİM YÖNETİMİ ---
router.post('/uretim', ctrlUretim.uretimEkle);
router.get('/uretim', ctrlUretim.uretimListele);
router.put('/uretim/:id', ctrlUretim.uretimGuncelle);
router.delete('/uretim/:id', ctrlUretim.uretimSil);

// --- ÜRÜN YÖNETİMİ ---
router.post('/urunler', ctrlUrun.urunEkle);
router.get('/urunler', ctrlUrun.urunleriListele);
router.put('/urunler/:id', ctrlUrun.urunGuncelle);
router.delete('/urunler/:id', ctrlUrun.urunSil);

// --- ÖDEME YÖNETİMİ ---
router.post('/odemeler', ctrlOdeme.odemeEkle);
router.get('/odemeler', ctrlOdeme.odemeListele);
router.put('/odemeler/:id', ctrlOdeme.odemeGuncelle);
router.delete('/odemeler/:id', ctrlOdeme.odemeSil);

// --- CARİ YÖNETİMİ ---
router.post('/cariler', ctrlCari.cariEkle);
router.get('/cariler', ctrlCari.cariListele);
router.put('/cariler/:id', ctrlCari.cariGuncelle);
router.delete('/cariler/:id', ctrlCari.cariSil);
router.get('/cariler/:id/ekstre', ctrlCari.getCariEkstre);

// --- KULLANICI / GİRİŞ (AUTH) ---
router.post('/kayit', ctrlAuth.kayitOl);
router.post('/auth/login', ctrlAuth.girisYap);

// --- DİĞER İŞLEMLER (MESAİ, RAPOR, İSTATİSTİK) ---
// Not: Bu kısımlar frontend'de nasıl çağrılıyorsa o şekilde kalmalı.
router.post('/attendance/upload', upload.single('file'), ctrlMesai.mesaiYukle);
router.post('/payroll/:employeeId/calculate', ctrlMesai.hakedisHesapla);
router.get('/reports', ctrlRapor.raporAl);
router.post('/reports/advanced-payroll', ctrlRapor.gelismisBordroRaporu);
router.post('/estimates/ai-forecast', ctrlTahmin.tahminYap);
router.post('/puantaj/yukle', ctrlPuantaj.puantajYukle);

// İstatistikler (Duplicate silindi, tek ve doğru olan bırakıldı)
router.get('/stats', ctrlStats.getDashboardStats);

module.exports = router;