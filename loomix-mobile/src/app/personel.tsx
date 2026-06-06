import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, LayoutAnimation, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, UIManager, View } from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function PersonelScreen() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    // Ekleme Modalı State'leri
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [submitLoading, setSubmitLoading] = useState(false);

    // Form Alanları State'leri
    const [newAdSoyad, setNewAdSoyad] = useState('');
    const [newPozisyon, setNewPozisyon] = useState('');
    const [newUcretTipi, setNewUcretTipi] = useState('Günlük');
    const [newUcretMiktari, setNewUcretMiktari] = useState('');
    const [newTelefon, setNewTelefon] = useState('');

    // Verileri Çekme Fonksiyonu (Dışarı aldık ki ekleme yapınca tekrar çağırabilelim)
    const fetchData = async () => {
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const response = await axios.get('https://loomix-backend.onrender.com/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
        } catch (error) {
            console.error("API Hatası:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // 🚀 YENİ: Personel Ekleme (POST) İşlemi
    const handleSavePersonel = async () => {
        if (!newAdSoyad || !newPozisyon || !newUcretMiktari) {
            Alert.alert("Eksik Bilgi", "Lütfen Ad Soyad, Pozisyon ve Ücret Miktarı alanlarını doldurun.");
            return;
        }

        setSubmitLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');

            // Senin Render backend'ine POST atıyoruz
            await axios.post('https://loomix-backend.onrender.com/api/employees', {
                adSoyad: newAdSoyad,
                pozisyon: newPozisyon,
                ucretTipi: newUcretTipi,
                ucretMiktari: Number(newUcretMiktari),
                telefon: newTelefon
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Başarılı", "Yeni personel sisteme kaydedildi!");

            // Modalı Kapat ve Formu Temizle
            setIsAddModalVisible(false);
            setNewAdSoyad('');
            setNewPozisyon('');
            setNewUcretMiktari('');
            setNewTelefon('');

            // Listeyi Yenile
            fetchData();

        } catch (error: any) {
            console.error("Kayıt Hatası:", error);
            Alert.alert("Hata", error.response?.data?.mesaj || "Kayıt işlemi başarısız oldu.");
        } finally {
            setSubmitLoading(false);
        }
    };

    const toplamIceridekiPara = data.filter(d => d.bakiye > 0).reduce((acc, curr) => acc + (curr.bakiye || 0), 0);
    const saatlikCalisanSayisi = data.filter(d => d.ucretTipi === 'Saatlik').length;
    const gunlukCalisanSayisi = data.length - saatlikCalisanSayisi;

    const toggleExpand = (id: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    const renderPersonelCard = ({ item }: { item: any }) => {
        const isAlacakli = item.bakiye > 0;
        const isBorclu = item.bakiye < 0;
        const isExpanded = expandedId === (item.employeeId || item._id);

        return (
            <View style={styles.personelCard}>
                <View style={styles.cardHeader}>
                    <View>
                        <Text style={styles.personelName}>{item.adSoyad || item.fullname}</Text>
                        <Text style={styles.personelPosition}>{item.pozisyon || item.position}</Text>
                    </View>
                    <View style={[styles.wageTag, item.ucretTipi === 'Saatlik' ? styles.tagPurple : styles.tagCyan]}>
                        <Text style={styles.wageTagText}>{item.ucretTipi} - {item.ucretMiktari || item.daily_wage} ₺</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.bakiyeLabel}>Cari Durum:</Text>
                    {isAlacakli && <Text style={[styles.bakiyeValue, { color: '#cf1322' }]}>Bizden Alacaklı: {item.bakiye} ₺</Text>}
                    {isBorclu && <Text style={[styles.bakiyeValue, { color: '#52c41a' }]}>Bize Borçlu: {Math.abs(item.bakiye)} ₺</Text>}
                    {!isAlacakli && !isBorclu && <Text style={[styles.bakiyeValue, { color: '#8c8c8c' }]}>Bakiye Sıfır</Text>}
                </View>

                <TouchableOpacity style={styles.actionButton} onPress={() => toggleExpand(item.employeeId || item._id)}>
                    <Text style={styles.actionButtonText}>
                        {isExpanded ? '▲ İşlemleri Gizle' : '▼ İşlemler (Tahakkuk / Ödeme)'}
                    </Text>
                </TouchableOpacity>

                {isExpanded && (
                    <View style={styles.expandedMenu}>
                        <View style={styles.menuRow}>
                            <TouchableOpacity style={[styles.menuButton, { borderColor: '#1890ff', backgroundColor: '#e6f7ff' }]}>
                                <Text style={{ color: '#1890ff', fontWeight: 'bold', fontSize: 12 }}>+ Tahakkuk</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.menuButton, { borderColor: '#cf1322', backgroundColor: '#fff1f0' }]}>
                                <Text style={{ color: '#cf1322', fontWeight: 'bold', fontSize: 12 }}>💸 Ödeme Yap</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={{ marginTop: 10, color: '#555' }}>Veriler Yükleniyor...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.summaryContainer}>
                <View style={[styles.summaryCard, { borderLeftColor: '#1890ff' }]}>
                    <Text style={styles.summaryTitle}>Aktif Personel</Text>
                    <Text style={styles.summaryValue}>{data.length}</Text>
                    <View style={styles.tagRow}>
                        <Text style={[styles.smallTag, styles.tagPurple]}>{saatlikCalisanSayisi} Saatlik</Text>
                        <Text style={[styles.smallTag, styles.tagCyan]}>{gunlukCalisanSayisi} Günlük</Text>
                    </View>
                </View>

                <View style={[styles.summaryCard, { borderLeftColor: '#cf1322' }]}>
                    <Text style={styles.summaryTitle}>Şirket Borcu</Text>
                    <Text style={[styles.summaryValue, { color: '#cf1322' }]}>{toplamIceridekiPara} ₺</Text>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Personel & Cari Yönetimi</Text>
                {/* MODALI AÇAN BUTON */}
                <TouchableOpacity style={styles.addButton} onPress={() => setIsAddModalVisible(true)}>
                    <Text style={styles.addButtonText}>+ Yeni Ekle</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={data}
                keyExtractor={(item, index) => (item.employeeId || item._id || index).toString()}
                renderItem={renderPersonelCard}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={false}
            />

            {/* YENİ EKLENEN KISIM: PERSONEL EKLEME MODALI */}
            <Modal visible={isAddModalVisible} animationType="slide" transparent={true} onRequestClose={() => setIsAddModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalContent}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Yeni Personel Kaydı</Text>
                                <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
                                    <Text style={styles.closeIcon}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Ad Soyad</Text>
                            <TextInput style={styles.input} placeholder="Örn: Ahmet Yılmaz" value={newAdSoyad} onChangeText={setNewAdSoyad} />

                            <Text style={styles.inputLabel}>Görev / Pozisyon</Text>
                            <TextInput style={styles.input} placeholder="Örn: Yazılım Uzmanı" value={newPozisyon} onChangeText={setNewPozisyon} />

                            <Text style={styles.inputLabel}>Ücret Hesaplama Tipi</Text>
                            <View style={styles.radioContainer}>
                                <TouchableOpacity
                                    style={[styles.radioButton, newUcretTipi === 'Günlük' && styles.radioActive]}
                                    onPress={() => setNewUcretTipi('Günlük')}
                                >
                                    <Text style={[styles.radioText, newUcretTipi === 'Günlük' && styles.radioTextActive]}>Günlük</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.radioButton, newUcretTipi === 'Saatlik' && styles.radioActive]}
                                    onPress={() => setNewUcretTipi('Saatlik')}
                                >
                                    <Text style={[styles.radioText, newUcretTipi === 'Saatlik' && styles.radioTextActive]}>Saatlik</Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Birim Ücreti (₺)</Text>
                            <TextInput style={styles.input} placeholder="Örn: 1500" keyboardType="numeric" value={newUcretMiktari} onChangeText={setNewUcretMiktari} />

                            <Text style={styles.inputLabel}>Telefon Numarası (Opsiyonel)</Text>
                            <TextInput style={styles.input} placeholder="Örn: 05xx xxx xx xx" keyboardType="phone-pad" value={newTelefon} onChangeText={setNewTelefon} />

                            <TouchableOpacity style={styles.saveButton} onPress={handleSavePersonel} disabled={submitLoading}>
                                {submitLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveButtonText}>Kaydet</Text>}
                            </TouchableOpacity>
                        </ScrollView>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    summaryContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    summaryCard: { backgroundColor: '#fff', width: '48%', padding: 15, borderRadius: 8, borderLeftWidth: 4, elevation: 2 },
    summaryTitle: { fontSize: 12, color: '#8c8c8c', marginBottom: 5 },
    summaryValue: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    tagRow: { flexDirection: 'row', marginTop: 8, gap: 5 },
    smallTag: { fontSize: 10, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, overflow: 'hidden' },

    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    addButton: { backgroundColor: '#1890ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
    addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },

    personelCard: { backgroundColor: '#fff', borderRadius: 8, padding: 15, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 10 },
    personelName: { fontSize: 16, fontWeight: 'bold', color: '#262626' },
    personelPosition: { fontSize: 13, color: '#8c8c8c', marginTop: 2 },
    wageTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
    wageTagText: { fontSize: 11, fontWeight: 'bold' },

    cardBody: { marginBottom: 10 },
    bakiyeLabel: { fontSize: 12, color: '#595959', marginBottom: 4 },
    bakiyeValue: { fontSize: 15, fontWeight: 'bold' },

    actionButton: { backgroundColor: '#f5f5f5', paddingVertical: 10, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: '#d9d9d9' },
    actionButtonText: { color: '#595959', fontSize: 13, fontWeight: 'bold' },

    expandedMenu: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },
    menuRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    menuButton: { width: '48%', paddingVertical: 10, alignItems: 'center', borderRadius: 6, borderWidth: 1 },

    tagPurple: { backgroundColor: '#f9f0ff', color: '#531dab' },
    tagCyan: { backgroundColor: '#e6fffb', color: '#08979c' },

    // Modala Ait Stiller
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    closeIcon: { fontSize: 20, color: '#999', padding: 5 },
    inputLabel: { fontSize: 13, color: '#555', marginBottom: 5, fontWeight: '500' },
    input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 15, borderWidth: 1, borderColor: '#e0e0e0', color: '#333' },
    radioContainer: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    radioButton: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#d9d9d9', alignItems: 'center', backgroundColor: '#fafafa' },
    radioActive: { borderColor: '#1890ff', backgroundColor: '#e6f7ff' },
    radioText: { color: '#595959', fontWeight: '500' },
    radioTextActive: { color: '#1890ff', fontWeight: 'bold' },
    saveButton: { backgroundColor: '#1890ff', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});