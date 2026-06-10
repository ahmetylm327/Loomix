import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RaporlarScreen() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // 🚀 YENİ: Arama Filtresi

    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState<any[]>([]);
    const [ekstreLoading, setEkstreLoading] = useState(false);
    const [seciliPersonel, setSeciliPersonel] = useState<any>(null);

    useEffect(() => {
        raporuCek();
    }, []);

    const raporuCek = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const response = await axios.post('http://192.168.231.156:5000/api/reports/advanced-payroll', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
        } catch (error) {
            Alert.alert("Hata", "Veriler alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const handleDetayGor = async (personel: any) => {
        setSeciliPersonel(personel);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const res = await axios.get(`http://192.168.231.156:5000/api/employees/${personel.id}/ekstre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEkstreData(res.data);
        } catch (error) {
            Alert.alert("Hata", "Personel hareketleri alınamadı!");
            setIsEkstreVisible(false);
        } finally {
            setEkstreLoading(false);
        }
    };

    // MİKRO MANTIĞI: Borç/Alacak Kontrolleri
    const isBorc = (islemTipi: string) => islemTipi === 'Ödeme' || islemTipi === 'Avans';
    const isAlacak = (islemTipi: string) => islemTipi === 'Hakediş' || islemTipi === 'Avans İadesi' || islemTipi === 'Prim';

    // EXCEL: ANA RAPOR (TÜM PERSONELLER)
    const exportAnaRaporExcel = async () => {
        if (!data?.liste || data.liste.length === 0) return Alert.alert("Uyarı", "Veri yok!");
        try {
            const basliklar = ["Personel", "Departman", "Toplam Hakedis", "Toplam Odenen", "Net Bakiye"];
            const satirlar = data.liste.map((item: any) => {
                return `${item.adSoyad};${item.departman};${item.toplamHakedis};${item.toplamOdenen};${item.bakiye}`;
            });

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaYolu = FileSystem.documentDirectory + `Personel_Cari_Ozet.csv`;

            await FileSystem.writeAsStringAsync(dosyaYolu, csvIcerik, { encoding: 'utf8' });
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dosyaYolu, { mimeType: 'text/csv' });
        } catch (error) { Alert.alert("Hata", "Excel oluşturulamadı."); }
    };

    // EXCEL: DETAYLI EKSTRE
    const exportEkstreExcel = async () => {
        if (!ekstreData || ekstreData.length === 0) return Alert.alert("Uyarı", "Veri yok!");
        try {
            const basliklar = ["Tarih", "Evrak Cinsi", "Aciklama", "TL Borc", "TL Alacak", "Bakiye"];
            const satirlar = ekstreData.map(item => {
                const tarih = new Date(item.islemTarihi).toLocaleDateString('tr-TR');
                const islem = item.islemTipi === 'Hakediş' ? 'Personel Tahakkuku' : (item.islemTipi === 'Ödeme' ? 'Kasa Tediye Fisi' : item.islemTipi);
                const aciklama = (item.aciklama || '-').replace(/;/g, ' ');
                const borc = isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0;
                const alacak = isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0;
                return `${tarih};${islem};${aciklama};${borc};${alacak};${item.bakiyeSonrasi || 0}`;
            });

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaYolu = FileSystem.documentDirectory + `${seciliPersonel?.adSoyad.replace(/[^a-zA-Z0-9]/g, '_')}_Ekstre.csv`;

            await FileSystem.writeAsStringAsync(dosyaYolu, csvIcerik, { encoding: 'utf8' });
            if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(dosyaYolu, { mimeType: 'text/csv' });
        } catch (error) { Alert.alert("Hata", "Excel oluşturulamadı."); }
    };

    // PDF: DETAYLI EKSTRE
    const exportEkstrePDF = async () => {
        if (!ekstreData || ekstreData.length === 0) return Alert.alert("Uyarı", "Veri yok!");
        try {
            let tableHtml = `
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
                    <tr style="background-color: #595959; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Tarih</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Evrak Cinsi</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Açıklama</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Borç (TL)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Alacak (TL)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Bakiye</th>
                    </tr>
            `;

            let totalBorc = 0;
            let totalAlacak = 0;

            ekstreData.forEach(item => {
                const borc = isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0;
                const alacak = isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0;
                totalBorc += borc;
                totalAlacak += alacak;

                tableHtml += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(item.islemTarihi).toLocaleDateString('tr-TR')}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.islemTipi === 'Hakediş' ? 'Tahakkuk' : item.islemTipi}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.aciklama || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #cf1322;">${borc > 0 ? borc.toLocaleString('tr-TR') : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #52c41a;">${alacak > 0 ? alacak.toLocaleString('tr-TR') : '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${Number(item.bakiyeSonrasi || 0).toLocaleString('tr-TR')}</td>
                    </tr>
                `;
            });

            const netBakiye = totalAlacak - totalBorc;

            tableHtml += `
                    <tr style="background-color: #fafafa; font-weight: bold;">
                        <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">GENEL TOPLAM:</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #cf1322;">${totalBorc.toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: #52c41a;">${totalAlacak.toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${netBakiye > 0 ? '#cf1322' : '#000'}">${netBakiye.toLocaleString('tr-TR')} ₺</td>
                    </tr>
                </table>
            `;

            const htmlContent = `
                <html>
                <body style="padding: 20px;">
                    <h2 style="text-align: center; color: #333; font-family: Arial, sans-serif;">${seciliPersonel?.adSoyad} - Cari Hesap Ekstresi</h2>
                    <p style="text-align: right; font-family: Arial, sans-serif; color: #666;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                    ${tableHtml}
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) { Alert.alert("Hata", "PDF oluşturulamadı."); }
    };

    // 🚀 YENİ: Arama Filtresi
    const filteredListe = (data?.liste || []).filter((p: any) =>
        (p.adSoyad || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.departman || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    const renderPersonel = ({ item }: any) => (
        <View style={styles.card}>
            <View style={{ flex: 1 }}>
                <Text style={styles.personelAdi}>{item.adSoyad}</Text>
                <Text style={styles.subText}>{item.departman}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <View style={[styles.bakiyeTag, { backgroundColor: item.bakiye > 0 ? '#fff1f0' : '#f6ffed' }]}>
                    <Text style={{ color: item.bakiye > 0 ? '#cf1322' : '#52c41a', fontWeight: 'bold' }}>
                        {item.bakiye?.toLocaleString('tr-TR')} ₺
                    </Text>
                </View>
                <TouchableOpacity style={styles.detayBtn} onPress={() => handleDetayGor(item)}>
                    <Text style={styles.detayBtnText}>Ekstre Gör ➔</Text>
                </TouchableOpacity>
            </View>
            <View style={styles.cardBottom}>
                <Text style={{ fontSize: 11, color: '#1890ff' }}>Hak: +{item.toplamHakedis?.toLocaleString('tr-TR')}</Text>
                <Text style={{ fontSize: 11, color: '#cf1322' }}>Ödenen: -{item.toplamOdenen?.toLocaleString('tr-TR')}</Text>
            </View>
        </View>
    );

    const renderEkstreSatir = ({ item }: any) => {
        const borc = isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0;
        const alacak = isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0;
        const bakiye = Number(item.bakiyeSonrasi || 0);

        return (
            <View style={styles.ekstreCard}>
                <View style={styles.row}>
                    <Text style={styles.tarihText}>{new Date(item.islemTarihi).toLocaleDateString('tr-TR')}</Text>
                    <Text style={styles.islemText}>{item.islemTipi === 'Hakediş' ? 'Tahakkuk (+)' : (item.islemTipi === 'Ödeme' ? 'Tediye Fişi (-)' : item.islemTipi)}</Text>
                </View>
                {item.aciklama ? <Text style={styles.aciklamaText}>{item.aciklama}</Text> : null}

                <View style={styles.tutarRow}>
                    <View style={styles.tutarCol}>
                        <Text style={styles.tutarLabel}>Ödenen (Borç)</Text>
                        <Text style={[styles.tutarValue, { color: borc > 0 ? '#cf1322' : '#ccc' }]}>{borc > 0 ? `${borc.toLocaleString('tr-TR')} ₺` : '-'}</Text>
                    </View>
                    <View style={styles.tutarCol}>
                        <Text style={styles.tutarLabel}>Hakediş (Alacak)</Text>
                        <Text style={[styles.tutarValue, { color: alacak > 0 ? '#52c41a' : '#ccc' }]}>{alacak > 0 ? `${alacak.toLocaleString('tr-TR')} ₺` : '-'}</Text>
                    </View>
                    <View style={[styles.tutarCol, { borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 10 }]}>
                        <Text style={styles.tutarLabel}>Bakiye</Text>
                        <Text style={[styles.tutarValue, { color: bakiye > 0 ? '#cf1322' : (bakiye < 0 ? '#3f8600' : '#000') }]}>{bakiye.toLocaleString('tr-TR')} ₺</Text>
                    </View>
                </View>
            </View>
        );
    };

    // Ekstre Özet Hesaplama
    let totalBorc = 0;
    let totalAlacak = 0;
    ekstreData.forEach(item => {
        if (isBorc(item.islemTipi)) totalBorc += Math.abs(item.tutar);
        if (isAlacak(item.islemTipi)) totalAlacak += Math.abs(item.tutar);
    });
    const netBakiye = totalAlacak - totalBorc;

    return (
        <View style={styles.container}>
            {/* YATAY KAYDIRILABİLİR İSTATİSTİK KARTLARI */}
            <View style={{ marginBottom: 15 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingRight: 10 }}>
                    <View style={[styles.statCard, { borderTopColor: '#1890ff' }]}>
                        <Text style={styles.statLabel}>Toplam Borçlanılan</Text>
                        <Text style={[styles.statValue, { color: '#1890ff' }]}>{data?.ozet?.toplamBorc?.toLocaleString('tr-TR') || 0} ₺</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#cf1322' }]}>
                        <Text style={styles.statLabel}>Toplam Ödenen</Text>
                        <Text style={[styles.statValue, { color: '#cf1322' }]}>{data?.ozet?.toplamOdenen?.toLocaleString('tr-TR') || 0} ₺</Text>
                    </View>
                    <View style={[styles.statCard, { borderTopColor: '#52c41a', backgroundColor: '#f6ffed' }]}>
                        <Text style={styles.statLabel}>Net Kalan Bakiye</Text>
                        <Text style={[styles.statValue, { color: data?.ozet?.netKalan > 0 ? '#cf1322' : '#3f8600' }]}>{data?.ozet?.netKalan?.toLocaleString('tr-TR') || 0} ₺</Text>
                    </View>
                </ScrollView>
            </View>

            {/* 🚀 YENİ: ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Personel Adı veya Departman Ara..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Personel Cari Dökümü</Text>
                <TouchableOpacity style={styles.excelBtnMini} onPress={exportAnaRaporExcel}>
                    <Text style={{ color: '#52c41a', fontSize: 12, fontWeight: 'bold' }}>📊 Tümünü İndir</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredListe}
                keyExtractor={(item) => item.id}
                renderItem={renderPersonel}
                refreshing={loading}
                onRefresh={raporuCek}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={ // 🚀 YENİ: Boş Durum Tasarımı
                    !loading ? (
                        <View style={{ alignItems: 'center', marginTop: 30 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>📋</Text>
                            <Text style={{ color: '#888', fontSize: 15 }}>Rapor bulunamadı.</Text>
                        </View>
                    ) : null
                }
            />

            {/* DETAYLI EKSTRE MODALI */}
            <Modal visible={isEkstreVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{seciliPersonel?.adSoyad}</Text>
                            <Text style={{ color: '#666' }}>Personel Ekstresi</Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={() => setIsEkstreVisible(false)}>
                            <Text style={{ fontSize: 18, color: '#333' }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.exportRow}>
                        <TouchableOpacity style={[styles.exportBtn, { borderColor: '#52c41a', backgroundColor: '#f6ffed' }]} onPress={exportEkstreExcel}>
                            <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>📊 Excel'e Aktar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { borderColor: '#cf1322', backgroundColor: '#fff1f0' }]} onPress={exportEkstrePDF}>
                            <Text style={{ color: '#cf1322', fontWeight: 'bold' }}>📄 PDF İndir</Text>
                        </TouchableOpacity>
                    </View>

                    {ekstreLoading ? (
                        <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 50 }} />
                    ) : (
                        <>
                            <FlatList
                                data={ekstreData}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={renderEkstreSatir}
                                contentContainerStyle={{ padding: 15, paddingBottom: 100 }}
                            />
                            {/* SABİT ALT TOPLAM BARI */}
                            <View style={styles.ozetBar}>
                                <View style={styles.ozetItem}>
                                    <Text style={styles.ozetLabel}>Toplam Ödenen</Text>
                                    <Text style={[styles.ozetValue, { color: '#cf1322' }]}>{totalBorc.toLocaleString('tr-TR')} ₺</Text>
                                </View>
                                <View style={styles.ozetItem}>
                                    <Text style={styles.ozetLabel}>Toplam Hakediş</Text>
                                    <Text style={[styles.ozetValue, { color: '#52c41a' }]}>{totalAlacak.toLocaleString('tr-TR')} ₺</Text>
                                </View>
                                <View style={[styles.ozetItem, { borderLeftWidth: 1, borderLeftColor: '#ddd', paddingLeft: 10 }]}>
                                    <Text style={styles.ozetLabel}>Kalan Bakiye</Text>
                                    <Text style={[styles.ozetValue, { color: netBakiye > 0 ? '#cf1322' : (netBakiye < 0 ? '#3f8600' : '#000'), fontSize: 16 }]}>
                                        {netBakiye.toLocaleString('tr-TR')} ₺
                                    </Text>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },

    // 🚀 YENİ ARAMA ÇUBUĞU STİLLERİ
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },

    statCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, minWidth: 140, borderTopWidth: 4, elevation: 1 },
    statLabel: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 5 },
    statValue: { fontSize: 18, fontWeight: 'bold' },

    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingHorizontal: 5 },
    listTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    excelBtnMini: { backgroundColor: '#f6ffed', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6, borderWidth: 1, borderColor: '#b7eb8f' },

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', elevation: 1 },
    personelAdi: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    subText: { fontSize: 12, color: '#888' },
    bakiyeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8, alignItems: 'center' },
    detayBtn: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#91d5ff' },
    detayBtnText: { color: '#1890ff', fontSize: 12, fontWeight: 'bold' },
    cardBottom: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0f0f0' },

    modalContainer: { flex: 1, backgroundColor: '#f0f2f5' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1890ff' },
    closeBtn: { padding: 5 },

    exportRow: { flexDirection: 'row', padding: 15, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    exportBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, alignItems: 'center' },

    ekstreCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1 },
    row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
    tarihText: { fontSize: 12, color: '#888', fontWeight: 'bold' },
    islemText: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    aciklamaText: { fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 },

    tutarRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10, marginTop: 5 },
    tutarCol: { flex: 1 },
    tutarLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
    tutarValue: { fontSize: 13, fontWeight: 'bold' },

    ozetBar: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', flexDirection: 'row', padding: 15, paddingBottom: 25, elevation: 10, borderTopWidth: 1, borderTopColor: '#ddd' },
    ozetItem: { flex: 1 },
    ozetLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
    ozetValue: { fontSize: 13, fontWeight: 'bold' }
});