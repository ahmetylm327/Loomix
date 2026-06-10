import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as DocumentPicker from 'expo-document-picker';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

// 🚀 AKILLI VE GENİŞLETİLEBİLİR RAPOR KARTI BİLEŞENİ
const ReportCard = ({ baslik, data, renk, ikon }: { baslik: string, data: any[], renk: string, ikon: string }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!data || data.length === 0) return null;

    const displayedData = isExpanded ? data : data.slice(0, 5);

    return (
        <View style={[styles.reportCard, { borderLeftColor: renk, borderLeftWidth: 4 }]}>
            <Text style={[styles.reportTitle, { color: renk }]}>{ikon} {baslik} ({data.length})</Text>

            {displayedData.map((item: any, index: number) => (
                <View key={index} style={styles.reportRow}>
                    <Text style={styles.reportName}>{item.isim}</Text>
                    {item.mesaj ? <Text style={styles.reportSub}>{item.mesaj}</Text> : null}
                    {item.tahakkukTutar ? <Text style={styles.reportTutar}>+ {item.tahakkukTutar} ₺</Text> : null}
                </View>
            ))}

            {data.length > 5 && (
                <TouchableOpacity
                    onPress={() => setIsExpanded(!isExpanded)}
                    style={styles.expandBtn}
                >
                    <Text style={{ color: '#1890ff', fontWeight: 'bold' }}>
                        {isExpanded ? "▲ Daha Az Göster" : `▼ + ${data.length - 5} Kişiyi Daha Gör`}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

export default function PuantajScreen() {
    const [loading, setLoading] = useState(false);
    const [rapor, setRapor] = useState<any>(null);

    // Ayar State'leri
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [settings, setSettings] = useState({
        baslangic: '08:00', bitis: '18:00',
        molaBas: '12:00', molaBit: '13:00',
        tolerans: '15',
        ctesiBaslangic: '08:00', ctesiBitis: '13:00'
    });

    useEffect(() => {
        fetchSettings(); // Sayfa yüklendiğinde ayarları çek
    }, []);

    // AYARLARI ÇEK
    const fetchSettings = async () => {
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const res = await axios.get('http://192.168.231.156:5000/api/attendance/settings', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data) {
                setSettings({
                    baslangic: res.data.baslangic || '08:00',
                    bitis: res.data.bitis || '18:00',
                    molaBas: res.data.molaBas || '12:00',
                    molaBit: res.data.molaBit || '13:00',
                    tolerans: res.data.tolerans ? res.data.tolerans.toString() : '15',
                    ctesiBaslangic: res.data.ctesiBaslangic || '08:00',
                    ctesiBitis: res.data.ctesiBitis || '13:00'
                });
            }
        } catch (error) {
            console.log("Ayarlar çekilemedi.");
        }
    };

    // AYARLARI KAYDET
    const handleSettingsSave = async () => {
        setSaveLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            await axios.post('http://192.168.231.156:5000/api/attendance/settings', {
                ...settings,
                tolerans: Number(settings.tolerans)
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert("Başarılı", "Mesai ayarları güncellendi!");
            setIsSettingsVisible(false);
        } catch (error) {
            Alert.alert("Hata", "Ayarlar kaydedilemedi.");
        } finally {
            setSaveLoading(false);
        }
    };

    // EXCEL DOSYASI SEÇ VE YÜKLE
    const pickAndUploadFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: [
                    '*/*',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/csv'
                ],
                copyToCacheDirectory: true
            });

            if (result.canceled === false && result.assets && result.assets.length > 0) {
                const file = result.assets[0];

                const isExcel = file.name.toLowerCase().endsWith('.xlsx') ||
                    file.name.toLowerCase().endsWith('.xls') ||
                    file.name.toLowerCase().endsWith('.csv');

                if (!isExcel) {
                    Alert.alert(
                        "Desteklenmeyen Format",
                        "Lütfen sadece Excel (.xlsx, .xls) veya CSV dosyası seçin. Eğer Google E-Tablolar kullanıyorsanız, dosyayı önce cihazınıza Excel olarak kaydetmelisiniz."
                    );
                    return;
                }

                setLoading(true); // Yükleme animasyonunu başlat

                const formData = new FormData();
                formData.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                } as any);

                const token = await AsyncStorage.getItem('loomix_token');
                const response = await axios.post('http://192.168.231.156:5000/api/attendance/upload', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                        Authorization: `Bearer ${token}`
                    }
                });

                Alert.alert("Başarılı", `${file.name} sisteme işlendi!`);
                setRapor(response.data.ozet);
            }
        } catch (error: any) {
            const errMsj = error.response?.data?.mesaj || "Dosya yüklenirken hata oluştu! Dosya formatını kontrol edin.";
            Alert.alert("Hata", errMsj);
        } finally {
            setLoading(false); // Yükleme animasyonunu bitir
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Puantaj Yükle</Text>
                <TouchableOpacity style={styles.settingsBtn} onPress={() => setIsSettingsVisible(true)}>
                    <Text style={styles.settingsBtnText}>⚙️ Mesai Ayarları</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.uploadArea} onPress={pickAndUploadFile} disabled={loading}>
                {loading ? (
                    <View style={{ alignItems: 'center' }}>
                        <ActivityIndicator size="large" color="#1890ff" />
                        <Text style={{ marginTop: 10, color: '#1890ff', fontWeight: 'bold' }}>Excel İşleniyor...</Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 4 }}>Bu işlem veri boyutuna göre birkaç saniye sürebilir.</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.uploadIcon}>📥</Text>
                        <Text style={styles.uploadText}>Cihazdan aldığınız Excel dosyasını seçmek için dokunun</Text>
                    </>
                )}
            </TouchableOpacity>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 10 }}>
                {rapor && (
                    <View style={{ animation: 'fadeIn 0.5s' }}>
                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { borderColor: '#1890ff' }]}><Text style={styles.statVal}>{rapor.basariliTahakkuklar?.length || 0}</Text><Text style={styles.statLbl}>İşlenen</Text></View>
                            <View style={[styles.statBox, { borderColor: '#faad14' }]}><Text style={[styles.statVal, { color: '#faad14' }]}>{rapor.sistemdeBulunamayanlar?.length || 0}</Text><Text style={styles.statLbl}>Kayıtsız</Text></View>
                            <View style={[styles.statBox, { borderColor: '#cf1322' }]}><Text style={[styles.statVal, { color: '#cf1322' }]}>{rapor.eksikBasimlar?.length || 0}</Text><Text style={styles.statLbl}>Eksik</Text></View>
                            <View style={[styles.statBox, { borderColor: '#fa8c16' }]}><Text style={[styles.statVal, { color: '#fa8c16' }]}>{rapor.zatenEklenenler?.length || 0}</Text><Text style={styles.statLbl}>Mükerrer</Text></View>
                        </View>

                        {/* RAPOR KARTLARI */}
                        <ReportCard baslik="Mükerrer (Çift) Kayıt Koruması" data={rapor.zatenEklenenler} renk="#fa8c16" ikon="🛑" />
                        <ReportCard baslik="Sistemde Kaydı Bulunamayanlar" data={rapor.sistemdeBulunamayanlar} renk="#faad14" ikon="⚠️" />
                        <ReportCard baslik="Sınır Dışı / Eksik Basım" data={rapor.eksikBasimlar} renk="#cf1322" ikon="❓" />
                        <ReportCard baslik="Başarıyla Maaşa İşlenenler" data={rapor.basariliTahakkuklar} renk="#52c41a" ikon="✅" />
                    </View>
                )}
            </ScrollView>

            {/* MESAİ AYARLARI MODALI */}
            <Modal visible={isSettingsVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
                        <View style={styles.modalHeaderRow}>
                            <Text style={styles.title}>Fabrika Mesai Ayarları</Text>
                            <TouchableOpacity onPress={() => setIsSettingsVisible(false)} style={{ padding: 5 }}>
                                <Text style={{ fontSize: 20 }}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.sectionTitle}>Hafta İçi (Standart Mesai)</Text>
                        <View style={styles.row}>
                            <View style={styles.col}><Text style={styles.label}>Başlangıç</Text><TextInput style={styles.input} value={settings.baslangic} onChangeText={v => setSettings({ ...settings, baslangic: v })} placeholder="08:00" /></View>
                            <View style={styles.col}><Text style={styles.label}>Bitiş</Text><TextInput style={styles.input} value={settings.bitis} onChangeText={v => setSettings({ ...settings, bitis: v })} placeholder="18:00" /></View>
                        </View>

                        <Text style={styles.sectionTitle}>Hafta Sonu (Cumartesi)</Text>
                        <View style={styles.row}>
                            <View style={styles.col}><Text style={styles.label}>Başlangıç</Text><TextInput style={styles.input} value={settings.ctesiBaslangic} onChangeText={v => setSettings({ ...settings, ctesiBaslangic: v })} placeholder="08:00" /></View>
                            <View style={styles.col}><Text style={styles.label}>Bitiş</Text><TextInput style={styles.input} value={settings.ctesiBitis} onChangeText={v => setSettings({ ...settings, ctesiBitis: v })} placeholder="13:00" /></View>
                        </View>

                        <Text style={styles.sectionTitle}>Mola & Tolerans</Text>
                        <View style={styles.row}>
                            <View style={styles.col}><Text style={styles.label}>Mola Başlangıç</Text><TextInput style={styles.input} value={settings.molaBas} onChangeText={v => setSettings({ ...settings, molaBas: v })} placeholder="12:00" /></View>
                            <View style={styles.col}><Text style={styles.label}>Mola Bitiş</Text><TextInput style={styles.input} value={settings.molaBit} onChangeText={v => setSettings({ ...settings, molaBit: v })} placeholder="13:00" /></View>
                        </View>
                        <Text style={styles.label}>Tolerans (Dakika)</Text>
                        <TextInput style={styles.input} keyboardType="numeric" value={settings.tolerans} onChangeText={v => setSettings({ ...settings, tolerans: v })} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSettingsSave} disabled={saveLoading}>
                            {saveLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>Ayarları Kaydet</Text>}
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
    settingsBtn: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, borderWidth: 1, borderColor: '#91d5ff' },
    settingsBtnText: { color: '#1890ff', fontWeight: 'bold' },

    uploadArea: { backgroundColor: '#fafafa', borderStyle: 'dashed', borderWidth: 2, borderColor: '#d9d9d9', borderRadius: 10, padding: 40, alignItems: 'center', marginBottom: 20 },
    uploadIcon: { fontSize: 40, marginBottom: 10 },
    uploadText: { fontSize: 14, color: '#666', textAlign: 'center', fontWeight: '500' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    statBox: { flex: 1, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, alignItems: 'center', elevation: 1 },
    statVal: { fontSize: 18, fontWeight: 'bold', color: '#1890ff' },
    statLbl: { fontSize: 10, color: '#888', marginTop: 4 },

    reportCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 1 },
    reportTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
    reportRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingVertical: 8 },
    reportName: { fontSize: 14, fontWeight: 'bold', color: '#333', flex: 1 },
    reportSub: { fontSize: 11, color: '#888', flex: 1 },
    reportTutar: { color: '#52c41a', fontWeight: 'bold', fontSize: 14 },
    expandBtn: { marginTop: 10, alignItems: 'center', padding: 12, backgroundColor: '#e6f7ff', borderRadius: 8, borderWidth: 1, borderColor: '#91d5ff' },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1890ff', marginTop: 15, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#e6f7ff', paddingBottom: 5 },
    row: { flexDirection: 'row', gap: 10 },
    col: { flex: 1 },
    label: { fontSize: 12, color: '#555', marginBottom: 4, fontWeight: 'bold' },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 12, marginBottom: 10, fontSize: 15 },
    saveBtn: { backgroundColor: '#1890ff', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 20 },
    saveBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});