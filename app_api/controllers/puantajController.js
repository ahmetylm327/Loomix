const multer = require('multer');
const xlsx = require('xlsx');
const mongoose = require('mongoose');
const Personel = mongoose.model('Personel'); // Personel veritabanına erişmek için çağırdık

const upload = multer({ storage: multer.memoryStorage() }).single('file');

const puantajYukle = (req, res) => {
    upload(req, res, async (err) => {
        if (err) return res.status(500).json({ description: "Dosya yükleme hatası" });
        if (!req.file) return res.status(400).json({ description: "Excel dosyası bulunamadı." });

        try {
            const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
            const sayfaAdi = workbook.SheetNames[0];
            const sayfa = workbook.Sheets[sayfaAdi];
            const excelVerisi = xlsx.utils.sheet_to_json(sayfa, { defval: "" });

            let islenenPersonelSayisi = 0;

            // 🚀 İŞTE SİHİR BURADA BAŞLIYOR: Tüm Excel satırlarını tek tek dönüyoruz
            for (let satir of excelVerisi) {
                // 1. Veritabanında bu isimde aktif bir personel var mı bul
                const personel = await Personel.findOne({ adSoyad: satir.AdSoyad, aktifMi: true });

                if (personel) {
                    let hakedis = 0;
                    let normalGun = Number(satir.NormalGun) || 0;
                    let mesaiSaati = Number(satir.FazlaMesaiSaat) || 0;

                    // 2. Ücret Tipine Göre Maaş Hesaplama Algoritması
                    if (personel.ucretTipi === 'Günlük') {
                        // Normal Gün Hakedişi
                        hakedis += normalGun * personel.ucretMiktari;

                        // Fazla Mesai: Günlük ücreti 8'e bölüp saatliğini bulur, %50 zamlı (1.5) ile çarparız
                        const saatlikUcret = personel.ucretMiktari / 8;
                        hakedis += mesaiSaati * (saatlikUcret * 1.5);
                    }
                    else if (personel.ucretTipi === 'Saatlik') {
                        // Normal günü saate çevir (1 gün = 8 saat) ve hesapla
                        hakedis += (normalGun * 8) * personel.ucretMiktari;
                        hakedis += mesaiSaati * (personel.ucretMiktari * 1.5);
                    }

                    // 3. Hesaplanan tutarı personelin cüzdanına (bakiyesine) ekle
                    personel.bakiye = (personel.bakiye || 0) + hakedis;
                    await personel.save(); // Veritabanına kaydet

                    islenenPersonelSayisi++;
                }
            }

            res.status(200).json({
                mesaj: "Excel başarıyla işlendi ve bakiyeler güncellendi!",
                okunanSatir: excelVerisi.length,
                guncellenenPersonel: islenenPersonelSayisi
            });

        } catch (hata) {
            console.error("🚨 Excel İşleme Hatası:", hata);
            res.status(500).json({ description: "Puantaj hesaplanırken hata oluştu", detay: hata.message });
        }
    });
};

module.exports = { puantajYukle };