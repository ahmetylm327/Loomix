import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CarilerScreen() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingCari, setEditingCari] = useState<any>(null);

    // Form State'leri (Kategori EKLENDİ)
    const [form, setForm] = useState({
        cariKodu: '', firmaAdi: '', kategori: 'Müşteri', vergiDairesi: '',
        vergiNo: '', telefon: '', email: '', adres: ''
    });

    const kategoriler = ['Müşteri', 'Tedarikçi', 'Toptancı', 'Fason', 'Diğer'];

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            // ☁️ CANLI (CLOUD) BAĞLANTISI (Cari Listeleme)
            const response = await axios.get('https://loomix-backend.onrender.com/api/caris', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
        } catch (error: any) {
            // 🚀 DEBUG DOKUNUŞU: Gerçek hatayı görmek için mesajı genişlettik
            Alert.alert("Veri Yükleme Hatası Detayı", error.message || "Bilinmeyen hata");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // EKLE VE GÜNCELLE
    const handleSave = async () => {
        if (!form.firmaAdi) return Alert.alert("Uyarı", "Firma Adı (Ünvan) zorunludur.");

        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };

            if (editingCari) {
                // ☁️ CANLI (CLOUD) BAĞLANTISI (Cari Güncelleme)
                await axios.put(`https://loomix-backend.onrender.com/api/caris/${editingCari._id}`, form, { headers });
                Alert.alert("Başarılı", "Firma bilgileri güncellendi!");
            } else {
                // ☁️ CANLI (CLOUD) BAĞLANTISI (Cari Ekleme)
                await axios.post('https://loomix-backend.onrender.com/api/caris', form, { headers });
                Alert.alert("Başarılı", "Yeni firma kaydedildi!");
            }

            setIsModalVisible(false);
            setForm({ cariKodu: '', firmaAdi: '', kategori: 'Müşteri', vergiDairesi: '', vergiNo: '', telefon: '', email: '', adres: '' });
            setEditingCari(null);
            fetchData();
        } catch (error: any) {
            // 🚀 DEBUG DOKUNUŞU: Kayıt esnasındaki gerçek teknik hatayı basıyoruz
            Alert.alert("Kayıt Hatası Detayı", error.response?.data?.description || error.message);
        }
    };

    // SİLME İŞLEMİ
    const handleDelete = (id: string) => {
        Alert.alert("Emin misiniz?", "Bu firmayı silerseniz tüm cari bağlantıları kopabilir. Emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        // ☁️ CANLI (CLOUD) BAĞLANTISI (Cari Silme)
                        await axios.delete(`https://loomix-backend.onrender.com/api/caris/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchData();
                    } catch (error: any) { Alert.alert("Hata", error.message); }
                }
            }
        ]);
    };

    const openEditModal = (item: any) => {
        setEditingCari(item);
        setForm({
            cariKodu: item.cariKodu || '',
            firmaAdi: item.firmaAdi || '',
            kategori: item.kategori || 'Müşteri',
            vergiDairesi: item.vergiDairesi || '',
            vergiNo: item.vergiNo || '',
            telefon: item.telefon || '',
            email: item.email || '',
            adres: item.adres || ''
        });
        setIsModalVisible(true);
    };

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.addButton} onPress={() => {
                setEditingCari(null);
                setForm({ cariKodu: '', firmaAdi: '', kategori: 'Müşteri', vergiDairesi: '', vergiNo: '', telefon: '', email: '', adres: '' });
                setIsModalVisible(true);
            }}>
                <Text style={styles.addButtonText}>+ Yeni Firma (Cari) Ekle</Text>
            </TouchableOpacity>

            {loading ? <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 20 }} /> : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item._id}
                    refreshing={loading}
                    onRefresh={fetchData}
                    renderItem={({ item }) => {
                        const bakiye = Number(item.bakiye || 0);
                        let bakiyeRenk = "#888";
                        let bakiyeMetin = "Bakiye Yok";

                        if (bakiye > 0) { bakiyeRenk = "#cf1322"; bakiyeMetin = `Bizden Alacaklı: ${bakiye.toLocaleString('tr-TR')} ₺`; }
                        else if (bakiye < 0) { bakiyeRenk = "#52c41a"; bakiyeMetin = `Bize Borçlu: ${Math.abs(bakiye).toLocaleString('tr-TR')} ₺`; }

                        return (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.firmaAdi}>{item.firmaAdi}</Text>
                                        <Text style={styles.kategoriTag}>{item.kategori || 'Müşteri'}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={[styles.bakiyeText, { color: bakiyeRenk }]}>{bakiyeMetin}</Text>
                                    </View>
                                </View>

                                <Text style={styles.text}>📞 {item.telefon || 'Telefon Yok'}  |  🏢 V.D: {item.vergiDairesi || '-'} ({item.vergiNo || '-'})</Text>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => openEditModal(item)}>
                                        <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>✏️ Düzenle</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item._id)}>
                                        <Text style={{ color: '#cf1322', fontWeight: 'bold' }}>🗑️ Sil</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    }}
                />
            )}

            {/* EKLE / DÜZENLE MODALI */}
            <Modal visible={isModalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.title}>{editingCari ? 'Firma Düzenle' : 'Yeni Firma Kartı'}</Text>

                        <Text style={styles.label}>Ünvanı (Firma Adı) *</Text>
                        <TextInput style={styles.input} value={form.firmaAdi} onChangeText={(v) => setForm({ ...form, firmaAdi: v })} />

                        <Text style={styles.label}>Kategori (Tedarikçi / Müşteri) *</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
                            {kategoriler.map(cat => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.chip, form.kategori === cat && styles.chipActive]}
                                    onPress={() => setForm({ ...form, kategori: cat })}
                                >
                                    <Text style={{ color: form.kategori === cat ? '#1890ff' : '#666', fontWeight: form.kategori === cat ? 'bold' : 'normal' }}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <Text style={styles.label}>Cari Kodu (İsteğe Bağlı)</Text>
                        <TextInput style={styles.input} value={form.cariKodu} onChangeText={(v) => setForm({ ...form, cariKodu: v })} placeholder="Örn: CARI-001" />

                        <View style={styles.row}>
                            <View style={styles.col}><Text style={styles.label}>Vergi Dairesi</Text><TextInput style={styles.input} value={form.vergiDairesi} onChangeText={(v) => setForm({ ...form, vergiDairesi: v })} /></View>
                            <View style={styles.col}><Text style={styles.label}>Vergi No</Text><TextInput style={styles.input} keyboardType="numeric" value={form.vergiNo} onChangeText={(v) => setForm({ ...form, vergiNo: v })} /></View>
                        </View>

                        <Text style={styles.label}>Telefon</Text>
                        <TextInput style={styles.input} keyboardType="phone-pad" value={form.telefon} onChangeText={(v) => setForm({ ...form, telefon: v })} />

                        <Text style={styles.label}>Açık Adres</Text>
                        <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} multiline value={form.adres} onChangeText={(v) => setForm({ ...form, adres: v })} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Firmayı Kaydet</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ marginTop: 15, alignItems: 'center' }}>
                            <Text style={{ color: '#999', fontSize: 16 }}>Vazgeç</Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
    addButton: { backgroundColor: '#1890ff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 15, elevation: 2 },
    addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    firmaAdi: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    kategoriTag: { fontSize: 11, color: '#1890ff', backgroundColor: '#e6f7ff', alignSelf: 'flex-start', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginTop: 4, overflow: 'hidden' },
    bakiyeText: { fontSize: 13, fontWeight: 'bold' },
    text: { fontSize: 12, color: '#666', marginBottom: 10 },

    actionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 5 },
    actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 5 },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    label: { fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, marginBottom: 15, fontSize: 15 },

    chip: { paddingHorizontal: 15, paddingVertical: 10, backgroundColor: '#f0f0f0', borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#ddd' },
    chipActive: { backgroundColor: '#e6f7ff', borderColor: '#1890ff' },

    row: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    saveBtn: { backgroundColor: '#1890ff', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 10 }
});