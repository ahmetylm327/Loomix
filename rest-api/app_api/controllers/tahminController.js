const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');
const Odeme = mongoose.model('Odeme');
const Urun = mongoose.model('Urun');

const tahminYap = async (req, res) => {
    try {
        const { forecastPeriod, confidenceLevel, includeSeasonality } = req.body;

        if (!forecastPeriod || !confidenceLevel) {
            return res.status(400).json({ description: "Tahmin periyodu ve güven seviyesi zorunludur." });
        }

        const uretimSayisi = await Uretim.countDocuments();
        if (uretimSayisi === 0) {
            return res.status(422).json({ error: "Analiz için son 4 haftaya ait üretim verisi eksik" });
        }

        const tumUretimler = await Uretim.find().populate('urunId');
        const tumGiderler = await Odeme.find({ islemYonu: 'Gider' });

        let gecmisToplamUretim = 0;
        let gecmisToplamCiro = 0;
        let gecmisToplamGider = 0;
        let toplamZorlukSkoru = 0;
        let aylikUretimGecmisi = {};

        // DÖNGÜ BAŞLIYOR (Buradaki u.adet kullanımları çok kritik!)
        tumUretimler.forEach(u => {
            const mevcutAdet = u.adet || 0; // Eğer veritabanında adet boş girilmişse 0 kabul et
            gecmisToplamUretim += mevcutAdet;

            if (u.uretimTarihi) {
                const ay = new Date(u.uretimTarihi).getMonth();
                aylikUretimGecmisi[ay] = (aylikUretimGecmisi[ay] || 0) + mevcutAdet;
            }

            if (u.urunId) {
                if (u.urunId.birimFiyat) {
                    gecmisToplamCiro += (mevcutAdet * u.urunId.birimFiyat);
                }

                let zorluk = u.urunId.zorlukDerecesi || 3;
                if (typeof zorluk === 'string') {
                    const z = zorluk.toLowerCase();
                    if (z.includes('kolay')) zorluk = 1;
                    else if (z.includes('orta')) zorluk = 3;
                    else if (z.includes('zor')) zorluk = 5;
                    else zorluk = 3;
                }

                toplamZorlukSkoru += (Number(zorluk) * mevcutAdet);
            }
        });

        tumGiderler.forEach(g => gecmisToplamGider += g.tutar);

        let ortalamaZorluk = gecmisToplamUretim > 0 ? (toplamZorlukSkoru / gecmisToplamUretim) : 3;
        let zorlukCarpani = 1;
        let giderZorlukEtkisi = 1;

        if (ortalamaZorluk > 3.5) {
            zorlukCarpani = 0.85;
            giderZorlukEtkisi = 1.05;
        } else if (ortalamaZorluk < 2.5) {
            zorlukCarpani = 1.15;
        }

        let zamanCarpani = 1;
        if (forecastPeriod === 'gelecekHafta') zamanCarpani = 0.25;
        if (forecastPeriod === 'gelecekAy') zamanCarpani = 1.2;
        if (forecastPeriod === 'gelecekYıl') zamanCarpani = 14.5;

        let mevsimEtkisi = 1;
        let sezonAnaliziRaporu = "Mevsimsellik analizi kapalı.";

        if (includeSeasonality) {
            if (forecastPeriod === 'gelecekYıl') {
                sezonAnaliziRaporu = "Yıllık tahminde tüm aylar (yaz/kış) dahil edildiği için mevsimsel dalgalanmalar nötralize edildi.";
            } else {
                const suAnkiAy = new Date().getMonth();
                const hedefAy = forecastPeriod === 'gelecekAy' ? (suAnkiAy + 1) % 12 : suAnkiAy;

                let toplamAylikVeri = 0;
                let veriGecilenAySayisi = 0;
                for (let ay in aylikUretimGecmisi) {
                    toplamAylikVeri += aylikUretimGecmisi[ay];
                    veriGecilenAySayisi++;
                }
                const genelAylikOrtalama = veriGecilenAySayisi > 0 ? (toplamAylikVeri / veriGecilenAySayisi) : 0;
                const hedefAyinGecmisUretimi = aylikUretimGecmisi[hedefAy] || 0;

                if (genelAylikOrtalama > 0 && hedefAyinGecmisUretimi > 0) {
                    mevsimEtkisi = hedefAyinGecmisUretimi / genelAylikOrtalama;
                    mevsimEtkisi = Math.max(0.7, Math.min(mevsimEtkisi, 1.5));

                    const farkYuzdesi = Math.round(Math.abs(mevsimEtkisi - 1) * 100);
                    const yon = mevsimEtkisi > 1 ? "üzerinde (Pozitif Sezon Etkisi)" : "altında (Negatif Sezon Etkisi)";
                    sezonAnaliziRaporu = `Hedeflenen ayın geçmiş üretim performansı, atölyenin genel ortalamasının %${farkYuzdesi} ${yon}. Tahmin buna göre ayarlandı.`;
                } else {
                    sezonAnaliziRaporu = "Hedeflenen ay (sezon) için veritabanında yeterli geçmiş veri bulunamadı, nötr çarpan uygulandı.";
                }
            }
        }

        const tahminiUretim = Math.round(gecmisToplamUretim * zamanCarpani * zorlukCarpani * mevsimEtkisi);
        const tahminiGelir = (gecmisToplamCiro * zamanCarpani * mevsimEtkisi).toFixed(2);
        const tahminiGider = (gecmisToplamGider * zamanCarpani * mevsimEtkisi * giderZorlukEtkisi).toFixed(2);

        const netKar = tahminiGelir - tahminiGider;
        let karMarji = 0;
        if (tahminiGelir > 0) {
            karMarji = Math.round((netKar / tahminiGelir) * 100);
        }

        let hesaplananGuven = confidenceLevel;
        if (forecastPeriod === 'gelecekYıl') hesaplananGuven -= 12;
        if (hesaplananGuven > 100) hesaplananGuven = 99;

        res.status(200).json({
            predictedProductionVolume: tahminiUretim,
            estimatedGrossRevenue: Number(tahminiGelir),
            projectedExpenses: Number(tahminiGider),
            aiProfitMargin: `%${Math.max(0, karMarji)}`,
            confidenceScore: `%${hesaplananGuven}`,
            _ekstraAnalizler: {
                urunZorlukEtkisi: `Geçmiş üretim ortalama zorluk seviyesi: ${ortalamaZorluk.toFixed(1)}/5.0`,
                sezonTrendEtkisi: sezonAnaliziRaporu
            }
        });

    } catch (hata) {
        res.status(500).json({ mesaj: "Tahmin motoru hatası", detay: hata.message });
    }
};

module.exports = { tahminYap };