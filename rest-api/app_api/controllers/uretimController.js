const mongoose = require('mongoose');
const Uretim = mongoose.model('Uretim');
const Urun = mongoose.model('Urun');
const Cari = mongoose.model('Cari');

// 🚀 YENİ: Kasa defterine otomatik kayıt atmak için Odeme modelini çağırıyoruz
const Odeme = mongoose.model('Odeme');

const uretimEkle = async (req, res) => {
    try {
        const { productId, cariId, quantity, birimFiyat, entryType, productionDate, notes } = req.body;

        const urun = await Urun.findById(productId);
        if (!urun) return res.status(404).json({ mesaj: "Ürün Bulunamadı" });

        const cari = await Cari.findById(cariId);
        if (!cari) return res.status(404).json({ mesaj: "Firma (Cari) Bulunamadı" });

        // Ekranda girilen özel fiyatı alıyoruz
        const uygulanacakFiyat = birimFiyat !== undefined ? Number(birimFiyat) : (urun.birimFiyat || 0);
        const islemTutari = uygulanacakFiyat * quantity;

        // 1. FİŞİ KES VE FİYATI MÜHÜRLE
        const yeniUretim = new Uretim({
            productId,
            cariId,
            quantity,
            birimFiyat: uygulanacakFiyat,
            entryType: entryType || "Günlük",
            productionDate,
            notes
        });
        await yeniUretim.save();

        // 2. FİRMAYA BORCUNU YAZ
        cari.bakiye = (cari.bakiye || 0) + islemTutari;
        await cari.save();

        // 3. 🚀 MÜŞTERİNİN İSTEDİĞİ TEK DEFTER MANTIĞI: KASAYA OTOMATİK GİDER YAZ!
        // Üretim fişi kesildiği an, kasadan bunu bir ödeme (mahsup) gibi düşüyoruz.
        const yeniOdeme = new Odeme({
            islemYonu: 'Gider', // Kasadan eksi olarak yansır
            odemeTipi: 'Nakit', // Varsayılan değer
            tutar: islemTutari,
            kategori: 'Firma (Cari) İşlemi',
            ilgiliId: cariId,
            odemeTarihi: productionDate || Date.now(),
            notlar: `Otomatik Mahsup (Fiş): ${urun.urunAdi} - ${quantity} Adet. ${notes || ''}`
        });
        await yeniOdeme.save();

        // 4. ÜRÜNÜN KALICI FİYATINI GÜNCELLE
        if (uygulanacakFiyat !== urun.birimFiyat) {
            urun.birimFiyat = uygulanacakFiyat;
            await urun.save();
            console.log(`Otomatik Güncelleme: "${urun.urunAdi}" fiyatı ${uygulanacakFiyat} ₺ olarak ayarlandı!`);
        }

        res.status(201).json({
            status: "Üretim başarıyla işlendi ve Kasaya otomatik yansıtıldı.",
            productionId: yeniUretim._id,
            guncelBakiye: cari.bakiye
        });

    } catch (hata) {
        res.status(400).json({ mesaj: "Kayıt Hatası", detay: hata.message });
    }
};

const uretimListele = async (req, res) => {
    try {
        const uretimler = await Uretim.find().populate('productId').populate('cariId').sort({ productionDate: -1 });
        res.status(200).json(uretimler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Üretimler listelenemedi", detay: hata.message });
    }
};

const uretimGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        const guncelUretim = await Uretim.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
        if (!guncelUretim) return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });
        res.status(200).json(guncelUretim);
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim güncellenemedi", detay: hata.message });
    }
};

const uretimSil = async (req, res) => {
    try {
        const id = req.params.id;

        // 1. Adım: Silinmeden önce fişi bul ve kime kesildiğine bak
        const silinecekUretim = await Uretim.findById(id);
        if (!silinecekUretim) return res.status(404).json({ mesaj: "Üretim kaydı bulunamadı." });

        const iptalTutari = silinecekUretim.quantity * (silinecekUretim.birimFiyat || 0);

        // 2. Adım: Fiş kime kesildiyse git borcundan düş.
        const cari = await Cari.findById(silinecekUretim.cariId);
        if (cari) {
            cari.bakiye = (cari.bakiye || 0) - iptalTutari;
            await cari.save();
        }

        // 🚀 3. Adım: KASADAN SİL! Otomatik attığımız o fiş kaydını bulup kasadan temizliyoruz
        await Odeme.findOneAndDelete({
            ilgiliId: silinecekUretim.cariId,
            tutar: iptalTutari,
            islemYonu: 'Gider',
            notlar: { $regex: /Otomatik Mahsup/i }
        });

        // 4. Adım: Fişi kalıcı olarak sil
        await Uretim.findByIdAndDelete(id);
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Üretim silinemedi", detay: hata.message });
    }
};

module.exports = { uretimEkle, uretimListele, uretimGuncelle, uretimSil };