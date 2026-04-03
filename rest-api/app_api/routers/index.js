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



router.post('/employees', ctrlPersonel.personelEkle);
router.get('/employees', ctrlPersonel.personelListele);
router.put('/employees/:employeeId', ctrlPersonel.personelGuncelle);
router.delete('/employees/:employeeId', ctrlPersonel.personelSil);
router.post('/attendance/upload', upload.single('file'), ctrlMesai.mesaiYukle);
router.post('/payroll/:employeeId/calculate', ctrlMesai.hakedisHesapla);
router.post('/production', ctrlUretim.uretimEkle);
router.post('/caris', ctrlCari.cariEkle);
router.get('/caris', ctrlCari.cariListele);
router.post('/products', ctrlUrun.urunEkle);
router.post('/payments', ctrlOdeme.odemeEkle);
router.get('/reports', ctrlRapor.raporAl);
router.post('/reports/advanced-payroll', ctrlRapor.gelismisBordroRaporu);
router.post('/kayit', ctrlAuth.kayitOl);
router.post('/auth/login', ctrlAuth.girisYap);
router.post('/estimates/ai-forecast', ctrlTahmin.tahminYap);
module.exports = router;