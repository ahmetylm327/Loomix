const express = require('express');
const router = express.Router();

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

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
const ctrlDenetim = require('../controllers/denetimController');

// ---------------------------------------------------------
// 👥 PERSONEL ROTALARI
// ---------------------------------------------------------
router.post('/employees', ctrlPersonel.personelEkle);
router.get('/employees', ctrlPersonel.personelListele);

// DİKKAT: Statik rotalar (bulk-pay), her zaman dinamik rotalardan (:employeeId) önce gelmelidir!
router.post('/employees/bulk-pay', ctrlPersonel.topluMaasOde);

router.put('/employees/:employeeId', ctrlPersonel.personelGuncelle);
router.delete('/employees/:employeeId', ctrlPersonel.personelSil);
router.post('/employees/:employeeId/pay', ctrlPersonel.personelOdemeYap);
router.get('/employees/:employeeId/ekstre', ctrlPersonel.getPersonelEkstre);
router.post('/employees/:employeeId/refund', ctrlPersonel.personelTahsilatYap);

// ---------------------------------------------------------
// 🕒 MESAİ VE PUANTAJ ROTALARI
// ---------------------------------------------------------
router.post('/attendance/upload', ctrlPuantaj.puantajYukle);
router.post('/puantaj/yukle', ctrlPuantaj.puantajYukle); // Bu da yedek köprü olarak kalsın

router.post('/payroll/:employeeId/calculate', ctrlMesai.hakedisHesapla);

// 🚀 YENİ EKLENEN: Dinamik Mesai Ayarları Rotaları
router.get('/attendance/settings', ctrlPuantaj.ayarlarıGetir);
router.post('/attendance/settings', ctrlPuantaj.ayarlarıGuncelle);
router.get('/mesai/haftalik-analiz', ctrlMesai.haftalikAnalizGetir);
router.post('/mesai/toplu-odeme', ctrlMesai.topluOdemeYap);
router.get('/mesai/gecmis-odemeler', ctrlMesai.gecmisOdemeleriGetir);
router.delete('/mesai/arsiv/:paketAdi', ctrlMesai.arsivSil);
router.get('/mesai/arsiv/:paketAdi', ctrlMesai.paketDetayGetir);
router.put('/mesai/arsiv', ctrlMesai.arsivGuncelle);

// ---------------------------------------------------------
// ⚙️ ÜRETİM ROTALARI
// ---------------------------------------------------------
router.post('/production', ctrlUretim.uretimEkle);
router.get('/production', ctrlUretim.uretimListele);
router.put('/production/:id', ctrlUretim.uretimGuncelle);
router.delete('/production/:id', ctrlUretim.uretimSil);

// ---------------------------------------------------------
// 🏢 CARİ (FİRMA) ROTALARI
// ---------------------------------------------------------
router.post('/caris', ctrlCari.cariEkle);
router.get('/caris', ctrlCari.cariListele);
router.put('/caris/:id', ctrlCari.cariGuncelle);
router.delete('/caris/:id', ctrlCari.cariSil);
router.get('/caris/:id/ekstre', ctrlCari.getCariEkstre);

// ---------------------------------------------------------
// 📦 STOK VE ÜRÜN ROTALARI
// ---------------------------------------------------------
router.post('/products', ctrlUrun.urunEkle);
router.get('/products', ctrlUrun.urunleriListele);
router.put('/products/:id', ctrlUrun.urunGuncelle);
router.delete('/products/:id', ctrlUrun.urunSil);

// ---------------------------------------------------------
// 💰 KASA VE ÖDEME ROTALARI
// ---------------------------------------------------------
router.post('/payments', ctrlOdeme.odemeEkle);
router.get('/payments', ctrlOdeme.odemeListele);
router.put('/payments/:id', ctrlOdeme.odemeGuncelle);
router.delete('/payments/:id', ctrlOdeme.odemeSil);

// ---------------------------------------------------------
// 📊 RAPOR, STATS VE AI ROTALARI
// ---------------------------------------------------------
router.get('/reports', ctrlRapor.raporAl);
router.post('/reports/advanced-payroll', ctrlRapor.gelismisBordroRaporu);
router.get('/stats', ctrlStats.getDashboardStats);
router.post('/estimates/ai-forecast', ctrlTahmin.tahminYap);

// ---------------------------------------------------------
// 🔐 YETKİLENDİRME (AUTH) ROTALARI
// ---------------------------------------------------------
router.post('/kayit', ctrlAuth.kayitOl);
router.post('/auth/login', ctrlAuth.girisYap);
router.get('/denetim/rapor', ctrlDenetim.denetimYap);
router.get('/denetim/onar', ctrlDenetim.hatalariOnar);

module.exports = router;