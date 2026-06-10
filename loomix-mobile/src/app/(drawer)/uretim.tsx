import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function UretimScreen() {
    const [uretimler, setUretimler] = useState<any[]>([]);
    const [urunler, setUrunler] = useState<any[]>([]);
    const [cariler, setCariler] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState(''); // 🚀 YENİ: Arama Filtresi

    // Form State'leri
    const [cariId, setCariId] = useState('');
    const [productId, setProductId] = useState('');
    const [stokKodu, setStokKodu] = useState('');
    const [birimFiyat, setBirimFiyat] = useState('');
    const [quantity, setQuantity] = useState('');
    const [notes, setNotes] = useState('');
    const [bulunanUrunAdi, setBulunanUrunAdi] = useState(''); // 🚀 YENİ: Bulunan ürünün adını tutacak state

    // 🚀 GÜVENLİK: Virgüllü sayı girişlerini noktaya çeviren yardımcı fonksiyon
    const safeNumber = (val: any) => {
        if (!val) return 0;
        return Number(val.toString().replace(',', '.')) || 0;
    };

    // SİSTEMDEKİ TÜM VERİLERİ ÇEK
    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };

            // ☁️ SAVAŞ MODU BAĞLANTILARI
            const [uretimRes, urunRes, cariRes] = await Promise.all([
                axios.get('http://192.168.231.156:5000/api/production', { headers }),
                axios.get('http://192.168.231.156:5000/api/products', { headers }),
                axios.get('http://192.168.231.156:5000/api/caris', { headers })
            ]);

            setUretimler(uretimRes.data);
            setUrunler(urunRes.data);
            setCariler(cariRes.data);
        } catch (error) {
            Alert.alert("Hata", "Üretim verileri alınamadı.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // AKILLI ARAMA (Stok Koduna Göre Ürün Bulma)
    const handleStokKoduChange = (text: string) => {
        setStokKodu(text);
        const bulunanUrun = urunler.find(u => u.stokKodu?.toLowerCase() === text.toLowerCase());

        if (bulunanUrun) {
            setProductId(bulunanUrun._id);
            setBirimFiyat(bulunanUrun.birimFiyat ? bulunanUrun.birimFiyat.toString() : '0');
            setBulunanUrunAdi(bulunanUrun.urunAdi || 'İsimsiz Ürün'); // 🚀 YENİ: Ürün adını state'e atıyoruz
        } else {
            setProductId('');
            setBirimFiyat('');
            setBulunanUrunAdi(''); // Bulunamadıysa temizle
        }
    };

    // YENİ FİŞ KAYDET
    const handleSave = async () => {
        const cleanQuantity = safeNumber(quantity);
        const cleanFiyat = safeNumber(birimFiyat);

        if (!cariId || !productId || cleanQuantity <= 0 || cleanFiyat < 0) {
            Alert.alert("Uyarı", "Lütfen Firma seçin, geçerli bir Ürün Kodu girin ve Adet/Fiyat alanlarını doğru doldurun.");
            return;
        }

        setSubmitLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            await axios.post('http://192.168.231.156:5000/api/production', {
                cariId,
                productId,
                quantity: cleanQuantity,
                birimFiyat: cleanFiyat,
                notes,
                productionDate: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Başarılı", "Fiş kesildi ve firma bakiyesine yansıdı!");
            setIsModalVisible(false);

            // Formu Temizle
            setCariId(''); setProductId(''); setStokKodu(''); setBirimFiyat(''); setQuantity(''); setNotes(''); setBulunanUrunAdi('');
            fetchData();
        } catch (error) {
            Alert.alert("Hata", "Fiş kesilemedi.");
        } finally {
            setSubmitLoading(false);
        }
    };

    // EXCEL İNDİRME FONKSİYONU
    const handleExcelIndir = async () => {
        if (uretimler.length === 0) {
            Alert.alert("Uyarı", "İndirilecek üretim verisi bulunamadı.");
            return;
        }

        try {
            const basliklar = ["Tarih", "Firma", "Urun", "Adet", "Birim Fiyat", "Fis Tutari", "Notlar"];

            const satirlar = uretimler.map(item => {
                const tarih = new Date(item.productionDate).toLocaleDateString('tr-TR');
                const firma = (item.cariId?.firmaAdi || 'Bilinmiyor').replace(/;/g, ' ');
                const urun = (item.productId?.urunAdi || 'Silinmiş Ürün').replace(/;/g, ' ');
                const adet = safeNumber(item.quantity);
                const fiyat = safeNumber(item.birimFiyat);
                const tutar = adet * fiyat;
                const not = (item.notes || '').replace(/;/g, ' ');

                return `${tarih};${firma};${urun};${adet};${fiyat};${tutar};${not}`;
            });

            const toplamAdet = uretimler.reduce((acc, curr) => acc + safeNumber(curr.quantity), 0);
            const toplamTutar = uretimler.reduce((acc, curr) => acc + (safeNumber(curr.quantity) * safeNumber(curr.birimFiyat)), 0);

            satirlar.push(`;;;;;;`);
            satirlar.push(`TOPLAM;;;${toplamAdet} Adet;;${toplamTutar} TL;`);

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaAdi = `Loomix_Uretim_Raporu_${new Date().getTime()}.csv`;
            const dosyaYolu = FileSystem.documentDirectory + dosyaAdi;

            await FileSystem.writeAsStringAsync(dosyaYolu, csvIcerik, { encoding: 'utf8' });

            const paylasilabilir = await Sharing.isAvailableAsync();
            if (paylasilabilir) {
                await Sharing.shareAsync(dosyaYolu, {
                    mimeType: 'text/csv',
                    dialogTitle: 'Üretim Raporunu Paylaş',
                });
            } else {
                Alert.alert("Hata", "Cihazınızda dosya paylaşımı desteklenmiyor.");
            }
        } catch (error) {
            Alert.alert("Hata", "Excel dosyası oluşturulurken bir sorun oluştu.");
        }
    };

    // FİŞ SİL
    const handleDelete = (id: string) => {
        Alert.alert("Fişi İptal Et", "Bu fişi silerseniz tutar firma bakiyesinden düşülecektir. Emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, İptal Et", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        await axios.delete(`http://192.168.231.156:5000/api/production/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchData();
                    } catch (error) {
                        Alert.alert("Hata", "Silme işlemi başarısız oldu.");
                    }
                }
            }
        ]);
    };

    // 🚀 YENİ: Arama Filtresi
    const filteredUretimler = uretimler.filter((u: any) =>
        (u.productId?.urunAdi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.cariId?.firmaAdi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.stokKodu || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>
            {/* ÜST BUTONLAR */}
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                <TouchableOpacity style={[styles.addButton, { flex: 1, backgroundColor: '#52c41a' }]} onPress={handleExcelIndir}>
                    <Text style={styles.addButtonText}>📊 Excel Çıktısı</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addButton, { flex: 2 }]} onPress={() => setIsModalVisible(true)}>
                    <Text style={styles.addButtonText}>+ Yeni Üretim Fişi</Text>
                </TouchableOpacity>
            </View>

            {/* 🚀 YENİ: ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Ürün, Firma veya Stok Kodu Ara..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredUretimler}
                keyExtractor={(item) => item._id}
                refreshing={loading}
                onRefresh={fetchData}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={ // 🚀 YENİ: Boş Durum Tasarımı
                    !loading ? (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>🏭</Text>
                            <Text style={{ color: '#888', fontSize: 16 }}>Kesilmiş bir üretim fişi bulunamadı.</Text>
                        </View>
                    ) : null
                }
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.row}>
                            <Text style={styles.bold}>{item.productId?.urunAdi || 'Silinmiş Ürün'}</Text>
                            <Text style={styles.tutar}>{(safeNumber(item.quantity) * safeNumber(item.birimFiyat)).toLocaleString('tr-TR')} ₺</Text>
                        </View>
                        <Text style={styles.subText}>🏢 {item.cariId?.firmaAdi || 'Bilinmiyor'}</Text>
                        <View style={[styles.row, { marginTop: 10, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }]}>
                            <Text style={{ fontSize: 12, color: '#666', fontWeight: 'bold' }}>
                                {new Date(item.productionDate).toLocaleDateString('tr-TR')} • {item.quantity} Adet x {item.birimFiyat} ₺
                            </Text>
                            <TouchableOpacity onPress={() => handleDelete(item._id)} style={styles.deleteBtn}>
                                <Text style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 12 }}>İptal Et</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            />

            {/* YENİ FİŞ KESME MODALI */}
            <Modal visible={isModalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>

                    {/* Çarpı Butonlu Header */}
                    <View style={styles.modalHeaderRow}>
                        <Text style={styles.title}>Üretim Fişi Kes</Text>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ padding: 10 }}>
                            <Text style={{ fontSize: 20, color: '#333', marginTop: -10 }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.label}>Firma Seçin</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {cariler.map(c => (
                                <TouchableOpacity
                                    key={c._id}
                                    style={[styles.chip, cariId === c._id && styles.chipActive]}
                                    onPress={() => setCariId(c._id)}
                                >
                                    <Text style={{ color: cariId === c._id ? '#1890ff' : '#666', fontWeight: cariId === c._id ? 'bold' : 'normal' }}>
                                        {c.firmaAdi}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Stok Kodu (Yazınca Ürün Bulunur)</Text>
                        <TextInput
                            style={[styles.input, productId ? { borderColor: '#52c41a', borderWidth: 2 } : {}]}
                            placeholder="Örn: SKT-001"
                            value={stokKodu}
                            onChangeText={handleStokKoduChange}
                            autoCapitalize="characters"
                        />
                        {/* 🚀 YENİ: Ürün adını ekranda gösteriyoruz */}
                        {productId ? <Text style={{ color: '#52c41a', marginBottom: 10, marginTop: -10, fontWeight: 'bold' }}>✓ Ürün Bulundu: {bulunanUrunAdi}</Text> : null}

                        <View style={styles.row}>
                            <View style={{ flex: 1, marginRight: 5 }}>
                                <Text style={styles.label}>Birim Fiyat (₺)</Text>
                                <TextInput style={styles.input} keyboardType="decimal-pad" value={birimFiyat} onChangeText={setBirimFiyat} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 5 }}>
                                <Text style={styles.label}>Adet</Text>
                                <TextInput style={styles.input} keyboardType="decimal-pad" value={quantity} onChangeText={setQuantity} />
                            </View>
                        </View>

                        <Text style={styles.label}>Notlar</Text>
                        <TextInput style={styles.input} placeholder="Açıklama (Opsiyonel)" value={notes} onChangeText={setNotes} />

                        <TouchableOpacity style={[styles.saveBtn, (!cariId || !productId) && { backgroundColor: '#ccc' }]} onPress={handleSave} disabled={submitLoading || !cariId || !productId}>
                            {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Fişi Kes ve Bakiyeye Yansıt</Text>}
                        </TouchableOpacity>

                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },

    // 🚀 YENİ ARAMA ÇUBUĞU STİLLERİ
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#722ed1' },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bold: { fontWeight: 'bold', fontSize: 16, color: '#333', flex: 1 },
    tutar: { color: '#722ed1', fontWeight: 'bold', fontSize: 16 },
    subText: { color: '#888', marginTop: 5, fontSize: 13 },
    deleteBtn: { backgroundColor: '#fff1f0', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: '#ffa39e' },

    addButton: { backgroundColor: '#1890ff', padding: 15, borderRadius: 8, alignItems: 'center', elevation: 2 },
    addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    label: { fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 16 },
    saveBtn: { backgroundColor: '#722ed1', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 10 },

    chip: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    chipActive: { backgroundColor: '#e6f7ff', borderColor: '#1890ff' }
});