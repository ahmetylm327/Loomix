const mongoose = require('mongoose');
const Cari = mongoose.model('Cari');
const Uretim = mongoose.model('Uretim');
const Odeme = mongoose.model('Odeme');

const cariEkle = async (req, res) => {
    try {
        console.log("1. Backend'e Ulaşan Ham Veri:", req.body);

        // React'ten gelen isimlerle (req.body.X) Şemadaki isimleri eşleştiriyoruz
        const firmaKaydi = {
            cariKodu: req.body.cariKodu,     // Burası çok kritikti!
            firmaAdi: req.body.firmaAdi,
            vergiDairesi: req.body.vergiDairesi,
            vergiNo: req.body.vergiNo,
            kategori: req.body.kategori || "Genel",
            telefon: req.body.telefon || "",
            email: req.body.email || "",
            bakiye: 0
        };

        console.log("2. Veritabanına Yazılmaya Hazır Veri:", firmaKaydi);

        // Veritabanına kaydet
        const yeniCari = await Cari.create(firmaKaydi);

        console.log("3. ✅ KAYIT BAŞARILI!");
        res.status(201).json(yeniCari);

    } catch (hata) {
        console.error("🚨 VERİTABANI HATASI:", hata.message);
        res.status(400).json({ description: hata.message });
    }
};

const cariListele = async (req, res) => {
    try {
        const cariler = await Cari.find().sort({ createdAt: -1 }); // En yeni eklenen en üstte
        res.status(200).json(cariler);
    } catch (hata) {
        res.status(500).json({ mesaj: "Firmalar getirilemedi" });
    }
};

const cariGuncelle = async (req, res) => {
    try {
        const id = req.params.id;
        // req.body içindeki tüm alanları olduğu gibi güncelle
        const guncelCari = await Cari.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });

        if (!guncelCari) {
            return res.status(404).json({ mesaj: "Firma bulunamadı." });
        }
        res.status(200).json(guncelCari);
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma güncellenemedi", detay: hata.message });
    }
};

const cariSil = async (req, res) => {
    try {
        const id = req.params.id;
        const silinenCari = await Cari.findByIdAndDelete(id);

        if (!silinenCari) {
            return res.status(404).json({ mesaj: "Firma bulunamadı." });
        }
        res.status(204).send();
    } catch (hata) {
        res.status(400).json({ mesaj: "Firma silinemedi", detay: hata.message });
    }
};

const getCariEkstre = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Ödemeleri çek (Şemandaki alan adı: ilgiliId)
        const odemeler = await Odeme.find({ ilgiliId: id });

        // 2. Üretimleri çek 
        // DİKKAT: Üretim şemanda cariId yok! 
        // Eğer üretimleri cariye bağlamadıysan burası boş döner. 
        // Şimdilik hata vermemesi için boş dizi atayalım veya ilgili alanı şemana eklemelisin.
        const uretimler = await Uretim.find({ cariId: id }).populate('productId');

        let ekstre = [];

        // Üretim döngüsü
        uretimler.forEach(u => {
            const tutar = u.quantity * (u.productId?.birimFiyat || 0);
            ekstre.push({
                key: u._id,
                tarih: u.productionDate,
                islemCinsi: "Üretim Girişi",
                aciklama: `${u.productId?.urunAdi || 'Ürün'} - ${u.quantity} Adet Dikim`,
                borc: tutar,
                alacak: 0,
            });
        });

        // Ödeme döngüsü
        odemeler.forEach(o => {
            ekstre.push({
                key: o._id,
                tarih: o.odemeTarihi,
                islemCinsi: `Kasa (${o.islemYonu})`,
                aciklama: o.notlar || "Ödeme Tahsilatı",
                borc: o.islemYonu === 'Gider' ? o.tutar : 0,
                alacak: o.islemYonu === 'Gelir' ? o.tutar : 0,
            });
        });

        // Tarih sıralama
        ekstre.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

        // Yürüyen Bakiye Hesabı (Doğru Formül)
        let toplamBorc = 0;
        let toplamAlacak = 0;
        let bakiyeAkim = 0;

        const formatliEkstre = ekstre.map(kalem => {
            toplamBorc += kalem.borc;
            toplamAlacak += kalem.alacak;
            bakiyeAkim = toplamBorc - toplamAlacak; // Her satırda borç - alacak
            return { ...kalem, yuruyenBakiye: bakiyeAkim };
        });

        res.json({
            liste: formatliEkstre,
            toplamBorc,
            toplamAlacak,
            bakiye: bakiyeAkim
        });

    } catch (error) {
        res.status(500).json({ mesaj: "Ekstre hazırlanamadı", hata: error.message });
    }
};

module.exports = { cariEkle, cariListele, cariGuncelle, cariSil, getCariEkstre };