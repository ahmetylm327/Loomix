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




router.post('/employees', ctrlPersonel.personelEkle);
router.get('/employees', ctrlPersonel.personelListele);
router.put('/employees/:employeeId', ctrlPersonel.personelGuncelle);
router.delete('/employees/:employeeId', ctrlPersonel.personelSil);
router.post('/employees/:employeeId/pay', ctrlPersonel.personelOdemeYap);
router.post('/attendance/upload', upload.single('file'), ctrlMesai.mesaiYukle);
router.post('/payroll/:employeeId/calculate', ctrlMesai.hakedisHesapla);
router.post('/production', ctrlUretim.uretimEkle);
router.get('/production', ctrlUretim.uretimListele);
router.put('/production/:id', ctrlUretim.uretimGuncelle);
router.delete('/production/:id', ctrlUretim.uretimSil);
router.post('/caris', ctrlCari.cariEkle);
router.get('/caris', ctrlCari.cariListele);
router.put('/caris/:id', ctrlCari.cariGuncelle);
router.delete('/caris/:id', ctrlCari.cariSil);
router.post('/products', ctrlUrun.urunEkle);
router.get('/products', ctrlUrun.urunleriListele);
router.put('/products/:id', ctrlUrun.urunGuncelle);
router.delete('/products/:id', ctrlUrun.urunSil);
router.post('/payments', ctrlOdeme.odemeEkle);
router.get('/payments', ctrlOdeme.odemeListele);
router.put('/payments/:id', ctrlOdeme.odemeGuncelle);
router.delete('/payments/:id', ctrlOdeme.odemeSil);
router.get('/reports', ctrlRapor.raporAl);
router.post('/reports/advanced-payroll', ctrlRapor.gelismisBordroRaporu);
router.post('/kayit', ctrlAuth.kayitOl);
router.post('/auth/login', ctrlAuth.girisYap);
router.post('/estimates/ai-forecast', ctrlTahmin.tahminYap);
router.post('/puantaj/yukle', ctrlPuantaj.puantajYukle);
router.get('/stats', ctrlPersonel.getDashboardStats);
module.exports = router;