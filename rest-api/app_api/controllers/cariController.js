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

        // Firmanın kasa hareketleri ve kesilen üretim fişleri çekilir
        const odemeler = await Odeme.find({ ilgiliId: id });
        const uretimler = await Uretim.find({ cariId: id }).populate('productId');

        let ekstre = [];

        // 1. Üretimler (Firmaya mal verdik -> Firmanın Bize Borcu ARTTI)
        uretimler.forEach(u => {
            const tutar = u.quantity * (u.birimFiyat || 0);
            ekstre.push({
                key: u._id,
                tarih: u.productionDate,
                islemCinsi: "Üretim / Fiş Kesimi",
                aciklama: `${u.productId?.urunAdi || 'Ürün'} - ${u.quantity} Adet`,
                borc: tutar, // Firmanın borcuna yazılır
                alacak: 0,
            });
        });

        // 2. Ödemeler (Kasadan yapılan işlemler)
        odemeler.forEach(o => {
            ekstre.push({
                key: o._id,
                tarih: o.odemeTarihi,
                islemCinsi: `Kasa İşlemi (${o.odemeTipi || 'Nakit'})`,
                aciklama: o.notlar || "Finansal İşlem",
                // Gelir (Firmadan tahsilat yaptık) -> Firmanın borcu düştü (Alacağa yazılır)
                alacak: o.islemYonu === 'Gelir' ? o.tutar : 0,
                // Gider (Firmaya biz para verdik) -> Firmanın borcu arttı (Borca yazılır)
                borc: o.islemYonu === 'Gider' ? o.tutar : 0,
            });
        });

        // 🚀 MATEMATİKSEL ŞAHESER:
        // Önce tarihi ESKİDEN YENİYE sıralayıp bakiyeyi (Yürüyen Bakiye) hatasız hesaplıyoruz
        ekstre.sort((a, b) => new Date(a.tarih) - new Date(b.tarih));

        let bakiyeAkim = 0;
        const formatliEkstre = ekstre.map(kalem => {
            bakiyeAkim += kalem.borc;
            bakiyeAkim -= kalem.alacak;
            return { ...kalem, yuruyenBakiye: bakiyeAkim };
        });

        // Hesaplama bittikten sonra müşterinin istediği gibi EN YENİ İŞLEM EN ÜSTE gelecek şekilde takla attırıyoruz!
        formatliEkstre.reverse();

        res.json({
            liste: formatliEkstre,
            toplamBorc: formatliEkstre.reduce((acc, curr) => acc + curr.borc, 0),
            toplamAlacak: formatliEkstre.reduce((acc, curr) => acc + curr.alacak, 0),
            bakiye: bakiyeAkim
        });

    } catch (error) {
        res.status(500).json({ mesaj: "Ekstre hazırlanamadı", hata: error.message });
    }
};
module.exports = { cariEkle, cariListele, cariGuncelle, cariSil, getCariEkstre };