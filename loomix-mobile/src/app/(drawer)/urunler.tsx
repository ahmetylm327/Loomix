import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function UrunlerScreen() {
    const [data, setData] = useState<any[]>([]);
    const [cariler, setCariler] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // 🚀 ARAMA STATE

    // Modal State'leri
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isCariModalVisible, setIsCariModalVisible] = useState(false); // Firma seçimi
    const [submitLoading, setSubmitLoading] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State'leri
    const [stokKodu, setStokKodu] = useState('');
    const [urunAdi, setUrunAdi] = useState('');
    const [birimFiyat, setBirimFiyat] = useState('');
    const [kdvOrani, setKdvOrani] = useState('10');
    const [birim, setBirim] = useState('Adet');
    const [cariId, setCariId] = useState('');
    const [cariAdi, setCariAdi] = useState('Firma Seçiniz...');
    const [aktifMi, setAktifMi] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };

            // ☁️ CANLI (CLOUD) BAĞLANTISI (Ürünler)
            const urunlerRes = await axios.get('https://loomix-backend.onrender.com/api/products', { headers });
            setData(urunlerRes.data);

            // ☁️ CANLI (CLOUD) BAĞLANTISI (Cariler)
            const carilerRes = await axios.get('https://loomix-backend.onrender.com/api/caris', { headers });
            setCariler(carilerRes.data);
        } catch (error) {
            Alert.alert("Hata", "Veri çekme hatası oluştu.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openAddModal = () => {
        setEditingId(null);
        setStokKodu('');
        setUrunAdi('');
        setBirimFiyat('');
        setKdvOrani('10');
        setBirim('Adet');
        setCariId('');
        setCariAdi('Firma Seçiniz...');
        setAktifMi(true);
        setIsModalVisible(true);
    };

    const openEditModal = (item: any) => {
        setEditingId(item._id);
        setStokKodu(item.stokKodu || '');
        setUrunAdi(item.urunAdi || '');
        setBirimFiyat(item.birimFiyat ? item.birimFiyat.toString() : '');
        setKdvOrani(item.kdvOrani ? item.kdvOrani.toString() : '10');
        setBirim(item.birim || 'Adet');
        setAktifMi(item.aktifMi ?? true);

        const firmaId = item.cariId ? (item.cariId._id || item.cariId) : '';
        const fAdi = item.cariId?.firmaAdi || 'Firma Yok';
        setCariId(firmaId);
        setCariAdi(fAdi);

        setIsModalVisible(true);
    };

    const handleSave = async () => {
        const safeFiyat = Number(birimFiyat.replace(',', '.')) || 0;
        const safeKdv = Number(kdvOrani.replace(',', '.')) || 0;

        if (!urunAdi || !stokKodu || safeFiyat <= 0 || !cariId) {
            Alert.alert("Eksik Bilgi", "Lütfen Ürün Adı, Stok Kodu, geçerli Fiyat ve Firma alanlarını doldurun.");
            return;
        }

        setSubmitLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const payload = {
                stokKodu,
                urunAdi,
                birimFiyat: safeFiyat,
                kdvOrani: safeKdv,
                birim,
                cariId,
                aktifMi
            };

            if (editingId) {
                // ☁️ CANLI (CLOUD) BAĞLANTISI (Güncelleme)
                await axios.put(`https://loomix-backend.onrender.com/api/products/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Alert.alert("Başarılı", "Model başarıyla güncellendi!");
            } else {
                // ☁️ CANLI (CLOUD) BAĞLANTISI (Ekleme)
                await axios.post('https://loomix-backend.onrender.com/api/products', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                Alert.alert("Başarılı", "Yeni model başarıyla eklendi!");
            }

            setIsModalVisible(false);
            fetchData();
        } catch (error: any) {
            Alert.alert("Hata", error.response?.data?.description || "Kayıt işlemi başarısız!");
        } finally {
            setSubmitLoading(false);
        }
    };

    const confirmDelete = (id: string) => {
        Alert.alert("Modeli Sil", "Bu modeli silmek istediğinize emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil",
                style: "destructive",
                onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        // ☁️ CANLI (CLOUD) BAĞLANTISI (Silme)
                        await axios.delete(`https://loomix-backend.onrender.com/api/products/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchData();
                    } catch (error) {
                        Alert.alert("Hata", "Silme işlemi başarısız.");
                    }
                }
            }
        ]);
    };

    // 🚀 ARAMA FİLTRESİ
    const filteredData = data.filter((item: any) =>
        (item.urunAdi || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.stokKodu || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.cariId?.firmaAdi || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderProductCard = ({ item }: { item: any }) => {
        const cariFirmaAdi = item.cariId?.firmaAdi || "Firma Yok";

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.urunAdi}>{item.urunAdi}</Text>
                        <Text style={styles.stokKodu}>Kodu: {item.stokKodu || 'KODSUZ'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: item.aktifMi ? '#f6ffed' : '#fff1f0', borderColor: item.aktifMi ? '#b7eb8f' : '#ffa39e' }]}>
                        <Text style={{ color: item.aktifMi ? '#52c41a' : '#f5222d', fontSize: 10, fontWeight: 'bold' }}>
                            {item.aktifMi ? 'AKTİF' : 'PASİF'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <View>
                        <Text style={styles.fiyatText}>{item.birimFiyat?.toLocaleString('tr-TR')} ₺</Text>
                        <Text style={styles.kdvText}>+%{(item.kdvOrani || 0)} KDV</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.firmaAdi}>🏢 {cariFirmaAdi}</Text>
                        <Text style={styles.kategoriText}>{item.kategori || 'Genel'} • {item.birim}</Text>
                    </View>
                </View>

                <View style={styles.cardActions}>
                    <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
                        <Text style={styles.editBtnText}>✏️ Düzenle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteBtn} onPress={() => confirmDelete(item._id)}>
                        <Text style={styles.deleteBtnText}>🗑️ Sil</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Stok ve Modeller</Text>
                <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
                    <Text style={styles.addButtonText}>+ Yeni Ekle</Text>
                </TouchableOpacity>
            </View>

            {/* ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Model, Stok Kodu veya Firma Ara..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#1890ff" />
                    <Text style={{ marginTop: 10, color: '#555' }}>Modeller Yükleniyor...</Text>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    keyExtractor={(item) => item._id}
                    renderItem={renderProductCard}
                    contentContainerStyle={{ paddingBottom: 20 }}
                    showsVerticalScrollIndicator={false}
                    refreshing={loading}
                    onRefresh={fetchData}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>📦</Text>
                            <Text style={{ color: '#888', fontSize: 16 }}>Sistemde kayıtlı model bulunamadı.</Text>
                        </View>
                    }
                />
            )}

            {/* ÜRÜN EKLEME / DÜZENLEME MODAL */}
            <Modal visible={isModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{editingId ? 'Modeli Güncelle' : 'Yeni Model Ekle'}</Text>
                                <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ padding: 5 }}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.label}>Stok Kodu *</Text>
                            <TextInput style={styles.input} placeholder="Örn: MDL-001" value={stokKodu} onChangeText={setStokKodu} autoCapitalize="characters" />

                            <Text style={styles.label}>Model / Ürün Adı *</Text>
                            <TextInput style={styles.input} placeholder="Örn: Siyah Tişört" value={urunAdi} onChangeText={setUrunAdi} />

                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>Birim Fiyat (₺) *</Text>
                                    <TextInput style={styles.input} placeholder="0.00" keyboardType="decimal-pad" value={birimFiyat} onChangeText={setBirimFiyat} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.label}>KDV (%)</Text>
                                    <TextInput style={styles.input} placeholder="10" keyboardType="numeric" value={kdvOrani} onChangeText={setKdvOrani} />
                                </View>
                            </View>

                            <Text style={styles.label}>Ait Olduğu Firma (Müşteri) *</Text>
                            <TouchableOpacity style={styles.selectBox} onPress={() => setIsCariModalVisible(true)}>
                                <Text style={{ color: cariId ? '#333' : '#999' }}>{cariAdi}</Text>
                                <Text style={{ color: '#999' }}>▼</Text>
                            </TouchableOpacity>

                            <View style={styles.switchRow}>
                                <Text style={styles.label}>Aktif (Satışta) Mi?</Text>
                                <Switch value={aktifMi} onValueChange={setAktifMi} />
                            </View>

                            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={submitLoading}>
                                {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Kaydet</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* FİRMA SEÇİM MODALI */}
            <Modal visible={isCariModalVisible} animationType="fade" transparent={true} onRequestClose={() => setIsCariModalVisible(false)}>
                <View style={styles.cariModalOverlay}>
                    <View style={styles.cariModalContent}>
                        <Text style={styles.modalTitle}>Firma Seçin</Text>
                        <FlatList
                            data={cariler}
                            keyExtractor={(item) => item._id}
                            style={{ marginTop: 10, maxHeight: 300 }}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={styles.cariItem}
                                    onPress={() => {
                                        setCariId(item._id);
                                        setCariAdi(item.firmaAdi);
                                        setIsCariModalVisible(false);
                                    }}
                                >
                                    <Text style={styles.cariItemText}>{item.firmaAdi}</Text>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.closeCariBtn} onPress={() => setIsCariModalVisible(false)}>
                            <Text style={styles.closeCariText}>İptal</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    addButton: { backgroundColor: '#1890ff', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, elevation: 2 },
    addButtonText: { color: '#fff', fontWeight: 'bold' },

    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },

    card: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 12, elevation: 1, borderLeftWidth: 4, borderLeftColor: '#faad14' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 10 },
    urunAdi: { fontSize: 16, fontWeight: 'bold', color: '#1890ff' },
    stokKodu: { fontSize: 12, color: '#888', marginTop: 2 },
    statusBadge: { borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, height: 20, justifyContent: 'center' },

    cardBody: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    fiyatText: { fontSize: 16, fontWeight: 'bold', color: '#3f8600' },
    kdvText: { fontSize: 11, color: '#aaa' },
    firmaAdi: { fontSize: 13, color: '#555', fontWeight: 'bold' },
    kategoriText: { fontSize: 11, color: '#888', marginTop: 2 },

    cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
    editBtn: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#91d5ff' },
    editBtnText: { color: '#1890ff', fontSize: 12, fontWeight: 'bold' },
    deleteBtn: { backgroundColor: '#fff1f0', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#ffa39e' },
    deleteBtnText: { color: '#cf1322', fontSize: 12, fontWeight: 'bold' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeIcon: { fontSize: 20, color: '#999' },
    label: { fontSize: 13, color: '#555', marginBottom: 5, fontWeight: '500' },
    input: { backgroundColor: '#f9f9f9', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', fontSize: 15 },
    selectBox: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#f9f9f9', borderRadius: 8, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, marginTop: 5 },
    saveBtn: { backgroundColor: '#1890ff', padding: 15, borderRadius: 8, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

    cariModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
    cariModalContent: { backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: 400 },
    cariItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
    cariItemText: { fontSize: 15, color: '#333' },
    closeCariBtn: { marginTop: 15, alignItems: 'center', padding: 10, backgroundColor: '#fff1f0', borderRadius: 8 },
    closeCariText: { color: '#f5222d', fontWeight: 'bold', fontSize: 15 }
});