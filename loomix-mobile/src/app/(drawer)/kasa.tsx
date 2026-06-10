import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function KasaScreen() {
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);

    // Veri Listeleri
    const [kasaData, setKasaData] = useState<any[]>([]);
    const [uretimData, setUretimData] = useState<any[]>([]);
    const [konsolideData, setKonsolideData] = useState<any[]>([]);
    const [malAlimiData, setMalAlimiData] = useState<any[]>([]);
    const [cariler, setCariler] = useState<any[]>([]);
    const [personeller, setPersoneller] = useState<any[]>([]);

    // İstatistikler
    const [stats, setStats] = useState({ toplamGelir: 0, toplamGider: 0, netBakiye: 0, toplamAlacak: 0, toplamTedarikciBorc: 0 });

    // UI State
    const [activeTab, setActiveTab] = useState('Konsolide'); // 'Kasa', 'Uretim', 'Konsolide', 'MalAlimi'

    // Form State
    const [islemYonu, setIslemYonu] = useState('Gelir');
    const [tutar, setTutar] = useState('');
    const [kategori, setKategori] = useState('Firma (Cari) İşlemi');
    const [relatedId, setRelatedId] = useState('');
    const [odemeTipi, setOdemeTipi] = useState('Nakit');
    const [notlar, setNotlar] = useState('');

    const kategoriler = [
        "Firma (Cari) İşlemi", "Personel İşlemi (Maaş/Avans)", "Kumaş Tedariği",
        "Kumaş/Malzeme Ödemesi", "Elektrik Faturası", "Su Faturası",
        "Ortak Gider", "Dükkan Kirası", "SSK", "Diğer"
    ];

    const fetchTumVeriler = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [kasaRes, uretimRes, cariRes, personelRes] = await Promise.all([
                axios.get('http://192.168.231.156:5000/api/payments', { headers }).catch(() => ({ data: [] })),
                axios.get('http://192.168.231.156:5000/api/production', { headers }).catch(() => ({ data: [] })),
                axios.get('http://192.168.231.156:5000/api/caris', { headers }).catch(() => ({ data: [] })),
                axios.get('http://192.168.231.156:5000/api/employees', { headers }).catch(() => ({ data: [] }))
            ]);

            const tumOdemeler = kasaRes.data || [];
            const uretimler = uretimRes.data || [];
            const firmalar = cariRes.data || [];
            const isciler = personelRes.data || [];

            setCariler(firmalar);
            setPersoneller(isciler);

            // MAL ALIMLARI
            const malAlimleri = tumOdemeler.filter((k: any) => k.islemYonu === 'MalAlimi').map((k: any) => ({ ...k, islemTuru: 'MalAlimi' }));

            // KASA İŞLEMLERİ
            const kasalar = tumOdemeler.filter((k: any) => k.islemYonu === 'Gelir' || k.islemYonu === 'Gider').map((k: any) => ({ ...k, islemTuru: 'Kasa' }));

            let gelir = 0; let gider = 0;
            kasalar.forEach((islem: any) => {
                const tutarVal = Number(islem.tutar || islem.amount) || 0;
                if (islem.islemYonu === 'Gelir') gelir += tutarVal;
                else if (islem.islemYonu === 'Gider') gider += tutarVal;
            });

            // CARİ BAKİYELER
            let gercekAlacak = 0; let tedarikciBorc = 0;
            firmalar.forEach((firma: any) => {
                const bakiye = Number(firma.bakiye) || 0;
                if (['Tedarikçi', 'Toptancı'].includes(firma.kategori)) tedarikciBorc += bakiye;
                else gercekAlacak += bakiye;
            });

            // ÜRETİM FİŞLERİ
            const formatliUretimler = uretimler.map((u: any) => ({
                ...u,
                islemTuru: 'Uretim',
                tutar: (u.quantity || 0) * (u.birimFiyat || 0),
                islemYonu: 'Alacak',
                odemeTarihi: u.productionDate || u.createdAt,
                kategori: 'Üretim / Fiş Kesimi',
                cariAdi: u.cariId?.firmaAdi || 'Bilinmeyen Firma'
            }));

            const birlesikListe = [...kasalar, ...formatliUretimler].sort((a, b) => new Date(b.odemeTarihi).getTime() - new Date(a.odemeTarihi).getTime());

            setKasaData(kasalar);
            setUretimData(formatliUretimler);
            setKonsolideData(birlesikListe);
            setMalAlimiData(malAlimleri);

            setStats({
                toplamGelir: gelir,
                toplamGider: gider,
                netBakiye: gelir - gider,
                toplamAlacak: gercekAlacak,
                toplamTedarikciBorc: tedarikciBorc
            });
        } catch (error) {
            Alert.alert("Hata", "Finansal veriler hesaplanırken sorun oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchTumVeriler(); }, []);

    // GÜVENLİ KAYIT İŞLEMİ (Virgül ve eksik ID korumalı)
    const handleSave = async () => {
        if (!tutar) return Alert.alert("Eksik", "Lütfen bir tutar girin.");

        // Sadece diğer kategorilerde muhatap aramayalım. Firma ve Personelde ID şart.
        if (!relatedId && kategori.includes("İşlemi")) {
            return Alert.alert("Eksik", "Lütfen bir firma veya personel seçin.");
        }

        const cleanTutar = Number(tutar.replace(',', '.')); // Virgüllü girilirse noktaya çevir
        if (isNaN(cleanTutar) || cleanTutar <= 0) return Alert.alert("Hata", "Geçerli bir tutar girin.");

        setSaveLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            await axios.post('http://192.168.231.156:5000/api/payments', {
                islemYonu, tutar: cleanTutar, kategori, odemeTipi, relatedId, notlar,
                odemeTarihi: new Date().toISOString()
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Başarılı", "İşlem eklendi ve bakiyelere yansıdı.");
            setIsModalVisible(false);
            setTutar(''); setNotlar(''); setRelatedId(''); setKategori('Firma (Cari) İşlemi');
            fetchTumVeriler();
        } catch (error) {
            Alert.alert("Hata", "Kasa işlemi kaydedilemedi.");
        } finally {
            setSaveLoading(false);
        }
    };

    const handleDelete = (id: string, islemTuru: string) => {
        if (islemTuru === 'Uretim') {
            Alert.alert("Uyarı", "Üretim fişleri sadece Üretim sayfasından silinebilir!");
            return;
        }
        Alert.alert("İşlemi Sil", "Bu kasa işlemini silerseniz karşı bakiyeler tersine döner. Emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        await axios.delete(`http://192.168.231.156:5000/api/payments/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchTumVeriler();
                    } catch (error) { Alert.alert("Hata", "İşlem silinemedi."); }
                }
            }
        ]);
    };

    const getActiveData = () => {
        if (activeTab === 'Kasa') return kasaData;
        if (activeTab === 'Uretim') return uretimData;
        if (activeTab === 'MalAlimi') return malAlimiData;
        return konsolideData;
    };

    const renderItem = ({ item }: any) => {
        let renk = '#595959';
        let isaret = '';
        let ikonText = '📄';
        let muhatap = 'Bilinmeyen';

        if (item.islemTuru === 'Uretim') { renk = '#722ed1'; isaret = '+'; muhatap = item.cariAdi; ikonText = '🏭'; }
        else if (item.islemTuru === 'MalAlimi') { renk = '#d46b08'; isaret = '-'; muhatap = "Tedarikçi"; ikonText = '🧵'; }
        else if (item.islemYonu === 'Gelir') { renk = '#52c41a'; isaret = '+'; ikonText = '⬇️'; }
        else if (item.islemYonu === 'Gider') { renk = '#ff4d4f'; isaret = '-'; ikonText = '⬆️'; }

        if (item.islemTuru !== 'Uretim' && item.islemTuru !== 'MalAlimi') {
            const cId = item.relatedId?._id || item.relatedId;
            if (cId === 'SAHSI_HARCAMA') muhatap = 'Şahsi/Şirket Harcaması';
            else {
                const cariBul = cariler.find(c => c._id === cId);
                const isciBul = personeller.find(p => p._id === cId);
                if (cariBul) muhatap = cariBul.firmaAdi;
                else if (isciBul) muhatap = isciBul.adSoyad || isciBul.isim;
            }
        }

        return (
            <TouchableOpacity style={[styles.card, { borderLeftColor: renk, borderLeftWidth: 4 }]} onLongPress={() => handleDelete(item._id, item.islemTuru)}>
                <View style={styles.row}>
                    <Text style={[styles.bold, { flex: 1 }]} numberOfLines={1}>{ikonText} {muhatap}</Text>
                    <Text style={{ color: renk, fontWeight: 'bold', fontSize: 16 }}>{isaret}{Number(item.tutar || item.amount || 0).toLocaleString('tr-TR')} ₺</Text>
                </View>
                <View style={[styles.row, { marginTop: 5 }]}>
                    <Text style={styles.subText}>{new Date(item.odemeTarihi || item.paymentDate || new Date()).toLocaleDateString('tr-TR')} • {item.kategori || 'İşlem'}</Text>
                    <Text style={styles.subText}>{item.islemTuru === 'Uretim' ? 'Fiş/Alacak' : 'Kasa İşlemi'}</Text>
                </View>
                {(item.notlar || item.notes) && <Text style={styles.noteBox}>{item.notlar || item.notes}</Text>}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* 4'LÜ BÜYÜK İSTATİSTİK GRID */}
            <View style={styles.grid}>
                <View style={[styles.statBox, { borderTopColor: '#1890ff' }]}>
                    <Text style={styles.statLabel}>Sıcak Kasa (Nakit)</Text>
                    <Text style={[styles.statValue, { color: '#1890ff' }]}>{stats.netBakiye.toLocaleString('tr-TR')} ₺</Text>
                </View>
                <View style={[styles.statBox, { borderTopColor: '#722ed1' }]}>
                    <Text style={styles.statLabel}>Piyasada Bekleyen</Text>
                    <Text style={[styles.statValue, { color: '#722ed1' }]}>{stats.toplamAlacak.toLocaleString('tr-TR')} ₺</Text>
                </View>
                <View style={[styles.statBox, { borderTopColor: '#d46b08' }]}>
                    <Text style={styles.statLabel}>Tedarikçi Borcu</Text>
                    <Text style={[styles.statValue, { color: '#d46b08' }]}>{stats.toplamTedarikciBorc.toLocaleString('tr-TR')} ₺</Text>
                </View>
                <View style={[styles.statBox, { borderTopColor: '#52c41a', backgroundColor: '#f6ffed' }]}>
                    <Text style={styles.statLabel}>ŞİRKET NET VARLIĞI</Text>
                    <Text style={[styles.statValue, { color: '#52c41a', fontSize: 18 }]}>{(stats.netBakiye + stats.toplamAlacak - stats.toplamTedarikciBorc).toLocaleString('tr-TR')} ₺</Text>
                </View>
            </View>

            {/* SEKME BUTONLARI */}
            <View style={{ marginBottom: 10 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {['Konsolide', 'Kasa', 'Uretim', 'MalAlimi'].map(tab => (
                        <TouchableOpacity key={tab} style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]} onPress={() => setActiveTab(tab)}>
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab === 'Konsolide' ? '🌐 Büyük Resim' : tab === 'Kasa' ? '💵 Kasa' : tab === 'Uretim' ? '🏭 Fişler' : '🧵 Tedarik'}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <FlatList
                data={getActiveData()}
                keyExtractor={(item, index) => item._id || index.toString()}
                renderItem={renderItem}
                refreshing={loading}
                onRefresh={fetchTumVeriler}
                ListEmptyComponent={ // BOŞ DURUM TASARIMI EKLENDİ
                    !loading ? (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                            <Text style={{ color: '#888', fontSize: 16 }}>Bu kategoride hiç işlem yok.</Text>
                        </View>
                    ) : null
                }
            />

            <TouchableOpacity style={styles.fabBtn} onPress={() => setIsModalVisible(true)}>
                <Text style={{ color: '#fff', fontSize: 24, marginTop: -2 }}>+</Text>
            </TouchableOpacity>

            {/* YENİ KASA İŞLEMİ MODALI */}
            <Modal visible={isModalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>Yeni Kasa İşlemi</Text>

                        <View style={styles.row}>
                            <TouchableOpacity style={[styles.toggleBtn, islemYonu === 'Gelir' && { backgroundColor: '#52c41a', borderColor: '#52c41a' }]} onPress={() => setIslemYonu('Gelir')}>
                                <Text style={{ color: islemYonu === 'Gelir' ? '#fff' : '#666', fontWeight: 'bold' }}>Tahsilat (Gelir)</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.toggleBtn, islemYonu === 'Gider' && { backgroundColor: '#ff4d4f', borderColor: '#ff4d4f' }]} onPress={() => setIslemYonu('Gider')}>
                                <Text style={{ color: islemYonu === 'Gider' ? '#fff' : '#666', fontWeight: 'bold' }}>Ödeme (Gider)</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Tutar (₺)</Text>
                        <TextInput style={[styles.input, { fontSize: 20, fontWeight: 'bold', color: islemYonu === 'Gelir' ? '#52c41a' : '#ff4d4f' }]} keyboardType="numeric" value={tutar} onChangeText={setTutar} placeholder="0.00" />

                        <Text style={styles.label}>Kategori</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {kategoriler.map(cat => (
                                <TouchableOpacity key={cat} style={[styles.chip, kategori === cat && styles.chipActive]} onPress={() => { setKategori(cat); setRelatedId(''); }}>
                                    <Text style={{ color: kategori === cat ? '#1890ff' : '#666' }}>{cat}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>İlgili Muhatap (Firma veya Personel)</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            <TouchableOpacity style={[styles.chip, relatedId === 'SAHSI_HARCAMA' && { backgroundColor: '#ffccc7', borderColor: '#ff4d4f' }]} onPress={() => setRelatedId('SAHSI_HARCAMA')}>
                                <Text style={{ color: relatedId === 'SAHSI_HARCAMA' ? '#cf1322' : '#666' }}>⚠️ Şahsi / Şirket Harcaması</Text>
                            </TouchableOpacity>

                            {kategori === 'Personel İşlemi (Maaş/Avans)' ?
                                personeller.map(p => (
                                    <TouchableOpacity key={p._id} style={[styles.chip, relatedId === p._id && styles.chipActive]} onPress={() => setRelatedId(p._id)}>
                                        <Text style={{ color: relatedId === p._id ? '#1890ff' : '#666' }}>👤 {p.adSoyad || p.isim}</Text>
                                    </TouchableOpacity>
                                ))
                                :
                                cariler.map(c => (
                                    <TouchableOpacity key={c._id} style={[styles.chip, relatedId === c._id && styles.chipActive]} onPress={() => setRelatedId(c._id)}>
                                        <Text style={{ color: relatedId === c._id ? '#1890ff' : '#666' }}>🏢 {c.firmaAdi}</Text>
                                    </TouchableOpacity>
                                ))
                            }
                        </ScrollView>

                        <Text style={styles.label}>Açıklama (Opsiyonel)</Text>
                        <TextInput style={styles.input} value={notlar} onChangeText={setNotlar} placeholder="Neye istinaden ödendi/alındı?" />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saveLoading}>
                            {saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>İşlemi Kaydet</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ marginTop: 20, alignItems: 'center' }}>
                            <Text style={{ color: '#999' }}>Vazgeç</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
    statBox: { width: '48%', backgroundColor: '#fff', padding: 12, borderRadius: 8, marginBottom: 10, borderTopWidth: 4, elevation: 1 },
    statLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 5 },
    statValue: { fontSize: 16, fontWeight: 'bold' },

    tabBtn: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e6f7ff', marginRight: 10, borderWidth: 1, borderColor: '#91d5ff' },
    tabBtnActive: { backgroundColor: '#1890ff' },
    tabText: { color: '#1890ff', fontWeight: 'bold', fontSize: 12 },
    tabTextActive: { color: '#fff' },

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    bold: { fontWeight: 'bold', fontSize: 14, color: '#333' },
    subText: { color: '#888', fontSize: 12 },
    noteBox: { fontSize: 11, color: '#595959', fontStyle: 'italic', marginTop: 8, backgroundColor: '#fafafa', padding: 6, borderRadius: 4, borderLeftWidth: 2, borderLeftColor: '#d9d9d9' },

    fabBtn: { position: 'absolute', bottom: 20, right: 20, width: 56, height: 56, backgroundColor: '#1890ff', borderRadius: 28, justifyContent: 'center', alignItems: 'center', elevation: 4 },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    toggleBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', alignItems: 'center', borderRadius: 8, marginHorizontal: 5 },
    label: { fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold', marginTop: 10 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 5 },
    chip: { paddingHorizontal: 15, paddingVertical: 8, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    chipActive: { backgroundColor: '#e6f7ff', borderColor: '#1890ff' },
    saveBtn: { backgroundColor: '#1890ff', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 20 },
});