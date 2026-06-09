import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function MaasScreen() {
    const [activeTab, setActiveTab] = useState('1'); // '1': Bu Hafta, '2': Arşiv
    const [loading, setLoading] = useState(true);

    // Veriler
    const [veriler, setVeriler] = useState<any[]>([]);
    const [arsiv, setArsiv] = useState<any[]>([]);

    // Form State
    const [paketIsmi, setPaketIsmi] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Modal State
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modalLoading, setModalLoading] = useState(false);
    const [seciliPaketDetaylari, setSeciliPaketDetaylari] = useState<any[]>([]);
    const [seciliPaketAdi, setSeciliPaketAdi] = useState('');

    // 🚀 GÜVENLİK: Virgüllü sayı girişlerini güvenli formata çeviren yardımcı fonksiyon
    const safeNumber = (val: any) => {
        if (!val) return 0;
        return Number(val.toString().replace(',', '.')) || 0;
    };

    useEffect(() => {
        const bugun = new Date();
        const formatliTarih = `${bugun.getDate().toString().padStart(2, '0')}/${(bugun.getMonth() + 1).toString().padStart(2, '0')}/${bugun.getFullYear()}`;
        setPaketIsmi(`Haftalık Maaş - ${formatliTarih}`);

        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };

            const [analizRes, arsivRes] = await Promise.all([
                axios.get('https://loomix-backend.onrender.com/api/mesai/haftalik-analiz', { headers }).catch(() => ({ data: [] })),
                axios.get('https://loomix-backend.onrender.com/api/mesai/gecmis-odemeler', { headers }).catch(() => ({ data: [] }))
            ]);

            const processed = Object.values(analizRes.data.reduce((acc: any, h: any) => {
                if (!h.personelId) return acc;
                const pId = h.personelId._id;

                if (!acc[pId]) {
                    acc[pId] = { pId, isim: h.personelId.adSoyad || h.personelId.isim, buHafta: 0 };
                }

                acc[pId].buHafta += h.tutar;
                return acc;
            }, {})).map((item: any) => ({ ...item, duzenlenenTutar: item.buHafta.toString() }));

            setVeriler(processed);
            setArsiv(arsivRes.data);
        } catch (error) {
            Alert.alert("Hata", "Veriler yüklenemedi.");
        } finally {
            setLoading(false);
        }
    };

    // TOPLU ÖDEME YAP
    const topluOdemeYap = async () => {
        if (arsiv.some(a => a._id === paketIsmi)) {
            Alert.alert("Uyarı", "Bu haftayı zaten ödediniz! Lütfen yeni bir paket ismi girin.");
            return;
        }

        Alert.alert("Ödemeleri Onayla", `"${paketIsmi}" paketini onaylıyor musunuz? Tüm manuel düzenlemeler personel ekstresine işlenecektir.`, [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Öde", onPress: async () => {
                    setIsSubmitting(true);
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        const list = veriler.map(v => ({
                            pId: v.pId,
                            buHafta: safeNumber(v.buHafta),
                            duzenlenenTutar: safeNumber(v.duzenlenenTutar)
                        }));

                        await axios.post('https://loomix-backend.onrender.com/api/mesai/toplu-odeme', { list, paketIsmi }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });

                        Alert.alert("Başarılı", "Ödemeler başarıyla arşivlendi ve kasaya işlendi!");
                        fetchData();
                    } catch (error) {
                        Alert.alert("Hata", "Ödeme kaydedilemedi.");
                    } finally {
                        setIsSubmitting(false);
                    }
                }
            }
        ]);
    };

    // ARŞİV SİL
    const arsivSil = (paketAdi: string) => {
        Alert.alert("Sil", "Bu arşivi silerseniz ödemeler geri alınacaktır. Emin misiniz?", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        await axios.delete(`https://loomix-backend.onrender.com/api/mesai/arsiv/${encodeURIComponent(paketAdi)}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchData();
                    } catch (error) { Alert.alert("Hata", "Silme işlemi başarısız."); }
                }
            }
        ]);
    };

    // ARŞİV DETAY GÖSTER
    const detayGoster = async (paketAdi: string) => {
        setSeciliPaketAdi(paketAdi);
        setIsModalVisible(true);
        setModalLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const res = await axios.get(`https://loomix-backend.onrender.com/api/mesai/arsiv/${encodeURIComponent(paketAdi)}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSeciliPaketDetaylari(res.data.map((d: any) => ({ ...d, editTutar: Math.abs(d.tutar).toString() })));
        } catch (error) {
            Alert.alert("Hata", "Detaylar alınamadı.");
            setIsModalVisible(false);
        } finally {
            setModalLoading(false);
        }
    };

    // ARŞİV GÜNCELLE
    const arsivGuncelle = async () => {
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const yeniListe = seciliPaketDetaylari.map(d => ({
                pId: d.personelId._id,
                buHafta: safeNumber(d.editTutar)
            }));

            await axios.put('https://loomix-backend.onrender.com/api/mesai/arsiv', {
                eskiPaketAdi: seciliPaketAdi,
                yeniListe,
                yeniPaketAdi: seciliPaketAdi
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            Alert.alert("Başarılı", "Arşiv güncellendi!");
            setIsModalVisible(false);
            fetchData();
        } catch (error) {
            Alert.alert("Hata", "Güncelleme başarısız.");
        }
    };

    // EXCEL ÇIKTISI
    const exportToExcel = async () => {
        if (veriler.length === 0) return Alert.alert("Uyarı", "İndirilecek veri yok.");
        try {
            const basliklar = ["Personel", "Hakedis (TL)"];
            const satirlar = veriler.map(v => `${v.isim};${safeNumber(v.duzenlenenTutar)}`);
            const toplam = veriler.reduce((acc, curr) => acc + safeNumber(curr.duzenlenenTutar), 0);

            satirlar.push(`;;`);
            satirlar.push(`TOPLAM ODENECEK;${toplam}`);

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaYolu = FileSystem.documentDirectory + `${paketIsmi.replace(/[^a-zA-Z0-9]/g, '_')}.csv`;

            await FileSystem.writeAsStringAsync(dosyaYolu, csvIcerik, { encoding: 'utf8' });
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) await Sharing.shareAsync(dosyaYolu, { mimeType: 'text/csv' });
        } catch (error) { Alert.alert("Hata", "Excel oluşturulamadı."); }
    };

    const toplamTalep = veriler.reduce((acc, curr) => acc + safeNumber(curr.duzenlenenTutar), 0);

    return (
        <View style={styles.container}>
            {/* TABS */}
            <View style={styles.tabContainer}>
                <TouchableOpacity style={[styles.tabBtn, activeTab === '1' && styles.tabBtnActive]} onPress={() => setActiveTab('1')}>
                    <Text style={[styles.tabText, activeTab === '1' && styles.tabTextActive]}>Bu Haftalık Hakediş</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.tabBtn, activeTab === '2' && styles.tabBtnActive]} onPress={() => setActiveTab('2')}>
                    <Text style={[styles.tabText, activeTab === '2' && styles.tabTextActive]}>Geçmiş Ödemeler</Text>
                </TouchableOpacity>
            </View>

            {loading ? <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 50 }} /> :
                activeTab === '1' ? (
                    // SEKME 1: BU HAFTA
                    <View style={{ flex: 1 }}>
                        <View style={styles.topCard}>
                            <Text style={styles.label}>Ödeme Paketi Adı</Text>
                            <TextInput style={styles.input} value={paketIsmi} onChangeText={setPaketIsmi} />
                            <TouchableOpacity style={styles.excelBtn} onPress={exportToExcel}>
                                <Text style={styles.excelBtnText}>📊 Raporu Excel Olarak İndir</Text>
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
                            {/* 🚀 YENİ: Boş Durum (Empty State) Tasarımı */}
                            {veriler.length === 0 ? (
                                <View style={{ alignItems: 'center', marginTop: 40 }}>
                                    <Text style={{ fontSize: 50, marginBottom: 10 }}>🎉</Text>
                                    <Text style={{ color: '#888', fontSize: 16, fontWeight: 'bold' }}>Bekleyen ödeme/hakediş yok!</Text>
                                    <Text style={{ color: '#aaa', fontSize: 12, marginTop: 5 }}>Puantajdan veri girildiğinde burada görünür.</Text>
                                </View>
                            ) : (
                                veriler.map((item, index) => (
                                    <View key={item.pId} style={styles.personCard}>
                                        <Text style={styles.personName}>{item.isim}</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.moneyInput}
                                                keyboardType="decimal-pad"
                                                value={item.duzenlenenTutar}
                                                onChangeText={(val) => {
                                                    const newVeriler = [...veriler];
                                                    newVeriler[index].duzenlenenTutar = val;
                                                    setVeriler(newVeriler);
                                                }}
                                            />
                                            <Text style={styles.currency}>₺</Text>
                                        </View>
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* STICKY BOTTOM BAR */}
                        <View style={styles.bottomBar}>
                            <View>
                                <Text style={{ color: '#888', fontSize: 12 }}>Toplam Ödenecek</Text>
                                <Text style={{ color: '#52c41a', fontSize: 20, fontWeight: 'bold' }}>{toplamTalep.toLocaleString('tr-TR')} ₺</Text>
                            </View>
                            <TouchableOpacity style={[styles.submitBtn, veriler.length === 0 && { backgroundColor: '#ccc' }]} onPress={topluOdemeYap} disabled={veriler.length === 0 || isSubmitting}>
                                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: 'bold' }}>Öde ve Arşivle</Text>}
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    // SEKME 2: ARŞİV
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {arsiv.map((item) => (
                            <View key={item._id} style={styles.archiveCard}>
                                <View style={styles.archiveHeader}>
                                    <Text style={styles.archiveTitle}>📁 {item._id}</Text>
                                </View>
                                <View style={styles.archiveActions}>
                                    <TouchableOpacity style={styles.actionBtnEdit} onPress={() => detayGoster(item._id)}>
                                        <Text style={styles.actionBtnTextEdit}>Düzenle / Detaylar</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.actionBtnDelete} onPress={() => arsivSil(item._id)}>
                                        <Text style={styles.actionBtnTextDelete}>Sil</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}
                        {arsiv.length === 0 && <Text style={{ textAlign: 'center', marginTop: 20, color: '#999' }}>Geçmiş ödeme bulunamadı.</Text>}
                    </ScrollView>
                )}

            {/* ARŞİV DÜZENLEME MODALI */}
            <Modal visible={isModalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>

                    {/* 🚀 YENİ: Çarpı Butonlu Header */}
                    <View style={styles.modalHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>Ödemeleri Düzenle</Text>
                            <Text style={{ color: '#666', marginBottom: 15 }}>{seciliPaketAdi}</Text>
                        </View>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ padding: 10 }}>
                            <Text style={{ fontSize: 20, color: '#333' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {modalLoading ? <ActivityIndicator size="large" color="#1890ff" /> : (
                        <ScrollView showsVerticalScrollIndicator={false}>
                            {seciliPaketDetaylari.map((item, index) => (
                                <View key={item._id} style={styles.personCard}>
                                    <Text style={styles.personName}>{item.personelId?.adSoyad || item.personelId?.isim}</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.moneyInput}
                                            keyboardType="decimal-pad"
                                            value={item.editTutar}
                                            onChangeText={(val) => {
                                                const yeni = [...seciliPaketDetaylari];
                                                yeni[index].editTutar = val;
                                                setSeciliPaketDetaylari(yeni);
                                            }}
                                        />
                                        <Text style={styles.currency}>₺</Text>
                                    </View>
                                </View>
                            ))}
                        </ScrollView>
                    )}

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 15 }}>
                        <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#ddd' }]} onPress={() => setIsModalVisible(false)}>
                            <Text style={{ color: '#666', fontWeight: 'bold' }}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.submitBtn, { flex: 2 }]} onPress={arsivGuncelle}>
                            <Text style={{ color: '#fff', fontWeight: 'bold' }}>Kaydet ve Güncelle</Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
    tabContainer: { flexDirection: 'row', backgroundColor: '#e6f7ff', borderRadius: 8, padding: 4, marginBottom: 15 },
    tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
    tabBtnActive: { backgroundColor: '#1890ff' },
    tabText: { color: '#1890ff', fontWeight: 'bold' },
    tabTextActive: { color: '#fff' },

    topCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
    label: { fontSize: 12, color: '#555', marginBottom: 5, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, marginBottom: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
    excelBtn: { backgroundColor: '#f6ffed', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: '#b7eb8f', alignItems: 'center' },
    excelBtnText: { color: '#52c41a', fontWeight: 'bold' },

    personCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
    personName: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10 },
    moneyInput: { fontSize: 18, fontWeight: 'bold', color: '#1890ff', width: 100, textAlign: 'right', paddingVertical: 8 },
    currency: { fontSize: 16, color: '#888', marginLeft: 5 },

    bottomBar: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 4 },
    submitBtn: { backgroundColor: '#1890ff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },

    archiveCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
    archiveHeader: { borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10, marginBottom: 10 },
    archiveTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    archiveActions: { flexDirection: 'row', gap: 10 },
    actionBtnEdit: { flex: 1, backgroundColor: '#e6f7ff', padding: 10, borderRadius: 6, alignItems: 'center' },
    actionBtnTextEdit: { color: '#1890ff', fontWeight: 'bold' },
    actionBtnDelete: { flex: 1, backgroundColor: '#fff1f0', padding: 10, borderRadius: 6, alignItems: 'center' },
    actionBtnTextDelete: { color: '#cf1322', fontWeight: 'bold' },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#f0f2f5' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' }
});