const mongoose = require('mongoose');
const Odeme = mongoose.model('Odeme');
const Uretim = mongoose.model('Uretim');
const Urun = mongoose.model('Urun');
const Personel = mongoose.model('Personel');

const raporAl = async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;
        if (!reportType || !startDate || !endDate) {
            return res.status(400).json({ description: "Hatalı Parametre: Tür ve tarih aralığı zorunludur." });
        }

        const baslangic = new Date(startDate);
        const bitis = new Date(endDate);
        bitis.setHours(23, 59, 59, 999);

        if (baslangic > bitis) {
            return res.status(400).json({ description: "Hatalı Tarih: Başlangıç tarihi bitişten büyük olamaz." });
        }

        let responseData = {
            reportTitle: `${startDate} - ${endDate} Tarihleri Arası ${reportType} Raporu`,
        };


        if (reportType === 'Finans' || reportType === 'Genel') {
            const odemeler = await Odeme.find({ odemeTarihi: { $gte: baslangic, $lte: bitis } });

            let totalIncome = 0;
            let totalExpenses = 0;

            odemeler.forEach(odeme => {
                if (odeme.islemYonu === 'Gelir') totalIncome += odeme.tutar;
                if (odeme.islemYonu === 'Gider') totalExpenses += odeme.tutar;
            });

            responseData.financialData = {
                totalIncome: totalIncome,
                totalExpenses: totalExpenses,
                netBalance: totalIncome - totalExpenses
            };
        }

        if (reportType === 'Performans' || reportType === 'Genel') {
            // Hem Türkçe hem İngilizce ihtimaline karşı iki tarihi de arıyoruz
            const uretimler = await Uretim.find({
                $or: [
                    { uretimTarihi: { $gte: baslangic, $lte: bitis } },
                    { productionDate: { $gte: baslangic, $lte: bitis } }
                ]
            }).populate({ path: 'urunId', strictPopulate: false })
                .populate({ path: 'productId', strictPopulate: false });

            let totalItemsProduced = 0;
            let urunSayaclari = {};

            uretimler.forEach(uretim => {
                // Adet veya quantity (Hangisi varsa onu al)
                const miktar = Number(uretim.adet || uretim.quantity || 0);
                totalItemsProduced += miktar;

                // urunId veya productId (Hangisi varsa onu al)
                const urun = uretim.urunId || uretim.productId;
                if (urun && (urun.urunAdi || urun.product_name)) {
                    const ad = urun.urunAdi || urun.product_name;
                    if (!urunSayaclari[ad]) urunSayaclari[ad] = 0;
                    urunSayaclari[ad] += miktar;
                }
            });

            let mostProducedProduct = "Veri Yok";
            let maxAdet = 0;
            for (const [urunAdi, adet] of Object.entries(urunSayaclari)) {
                if (adet > maxAdet) {
                    maxAdet = adet;
                    mostProducedProduct = urunAdi;
                }
            }

            responseData.productionData = {
                totalItemsProduced: totalItemsProduced,
                mostProducedProduct: mostProducedProduct // Büyük 'P' ile gönderiyoruz
            };
        }

        res.status(200).json(responseData);
    } catch (hata) {
        res.status(400).json({ description: "Geçersiz Veri Formatı", detay: hata.message });
    }
};
const gelismisBordroRaporu = async (req, res) => {
    try {
        const { startDate, endDate, includeExpenses, manuelEntries } = req.body;

        const baslangic = new Date(startDate);
        const bitis = new Date(endDate);
        bitis.setHours(23, 59, 59, 999);

        let finalRapor = {
            baslik: `${startDate} / ${endDate} Haftalık Ödeme ve Bordro Listesi`,
            kalemler: [],
            genelToplamGider: 0
        };
        // PERSONEL LİSTESİNİ EKLE    
        const personeller = await Personel.find();
        personeller.forEach(p => {
            const maas = p.ucretMiktari || 0;

            finalRapor.kalemler.push({
                tur: "Personel Maaş/Yevmiye",
                aciklama: `${p.adSoyad || 'İsimsiz Personel'} (${p.pozisyon || 'Belirtilmemiş'})`,
                tutar: maas
            });
            finalRapor.genelToplamGider += maas;
        });

        //EĞER USTABAŞI "GİDERLERİ DE GÖSTER" SEÇENEĞİNİ İŞARETLEDİYSE
        if (includeExpenses === true) {
            const haftalikGiderler = await Odeme.find({
                islemYonu: 'Gider',
                odemeTarihi: { $gte: baslangic, $lte: bitis }
            });

            haftalikGiderler.forEach(gider => {
                finalRapor.kalemler.push({
                    tur: `Firma Gideri (${gider.kategori})`,
                    aciklama: gider.notlar || "Belirtilmemiş",
                    tutar: gider.tutar
                });
                finalRapor.genelToplamGider += gider.tutar;
            });
        }

        //EĞER USTABAŞI LİSTEYE ELLE BİR ŞEYLER YAZDIYSA
        if (manuelEntries && manuelEntries.length > 0) {
            manuelEntries.forEach(ekstra => {
                finalRapor.kalemler.push({
                    tur: "Manuel Eklenen (Ustabaşı Notu)",
                    aciklama: ekstra.aciklama,
                    tutar: ekstra.tutar
                });
                finalRapor.genelToplamGider += ekstra.tutar;
            });
        }

        res.status(200).json(finalRapor);
    } catch (hata) {
        res.status(500).json({ mesaj: "Gelişmiş rapor oluşturulamadı", detay: hata.message });
    }
};
module.exports = { raporAl, gelismisBordroRaporu };
