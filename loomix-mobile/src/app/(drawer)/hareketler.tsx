import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CariHareketleriScreen() {
    const [cariler, setCariler] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // 🚀 YENİ: Arama state'i

    const [isEkstreVisible, setIsEkstreVisible] = useState(false);
    const [ekstreData, setEkstreData] = useState<any[]>([]);
    const [ekstreOzet, setEkstreOzet] = useState<any>({});
    const [ekstreLoading, setEkstreLoading] = useState(false);
    const [seciliCari, setSeciliCari] = useState<any>(null);

    useEffect(() => {
        fetchCariler();
    }, []);

    const fetchCariler = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const response = await axios.get('https://loomix-backend.onrender.com/api/caris', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCariler(response.data);
        } catch (error) {
            Alert.alert("Hata", "Firma listesi alınamadı!");
        } finally {
            setLoading(false);
        }
    };

    const handleDetayGor = async (cari: any) => {
        setSeciliCari(cari);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const res = await axios.get(`https://loomix-backend.onrender.com/api/caris/${cari._id}/ekstre`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            const isTedarikci = cari.kategori === 'Tedarikçi' || cari.kategori === 'Toptancı';
            const duzenlenmisListe = res.data.liste.map((item: any) => ({
                ...item,
                islemCinsi: (isTedarikci && item.islemCinsi === "Üretim / Fiş Kesimi") ? "Malzeme Alımı (Fiş)" : item.islemCinsi
            }));

            setEkstreData(duzenlenmisListe);
            setEkstreOzet({
                toplamBorc: res.data.toplamBorc,
                toplamAlacak: res.data.toplamAlacak,
                bakiye: res.data.bakiye
            });
        } catch (error) {
            Alert.alert("Hata", "Cari hareketleri alınamadı!");
            setIsEkstreVisible(false);
        } finally {
            setEkstreLoading(false);
        }
    };

    const isTedarikci = seciliCari?.kategori === 'Tedarikçi' || seciliCari?.kategori === 'Toptancı';
    const borcBaslik = isTedarikci ? 'Yaptığımız Ödeme' : 'Kestiğimiz Fiş/Borç';
    const alacakBaslik = isTedarikci ? 'Aldığımız Malzeme' : 'Aldığımız Tahsilat';

    // EXCEL (CSV) ÇIKTISI
    const exportEkstreExcel = async () => {
        if (!ekstreData || ekstreData.length === 0) return Alert.alert("Uyarı", "İndirilecek veri yok!");
        try {
            const basliklar = ["Tarih", "Islem Cinsi", "Aciklama", borcBaslik.replace(/[^a-zA-Z0-9 ]/g, ''), alacakBaslik.replace(/[^a-zA-Z0-9 ]/g, ''), "Bakiye"];
            const satirlar = ekstreData.map(item => {
                const tarih = new Date(item.tarih).toLocaleDateString('tr-TR');
                const islem = item.islemCinsi.replace(/;/g, ' ');
                const aciklama = (item.aciklama || '-').replace(/;/g, ' ');
                const borc = Math.abs(Number(item.borc || 0));
                const alacak = Math.abs(Number(item.alacak || 0));
                const bakiye = Math.abs(Number(item.yuruyenBakiye || 0));
                return `${tarih};${islem};${aciklama};${borc};${alacak};${bakiye}`;
            });

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaYolu = FileSystem.documentDirectory + `${seciliCari?.firmaAdi.replace(/[^a-zA-Z0-9]/g, '_')}_Ekstre.csv`;

            await FileSystem.writeAsStringAsync(dosyaYolu, csvIcerik, { encoding: 'utf8' });
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(dosyaYolu, { mimeType: 'text/csv', dialogTitle: 'Ekstreyi Paylaş' });
            }
        } catch (error) { Alert.alert("Hata", "Excel oluşturulamadı."); }
    };

    // PDF ÇIKTISI
    const exportEkstrePDF = async () => {
        if (!ekstreData || ekstreData.length === 0) return Alert.alert("Uyarı", "İndirilecek veri yok!");
        try {
            let tableHtml = `
                <table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 12px;">
                    <tr style="background-color: #1890ff; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Tarih</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">İşlem Cinsi</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Açıklama</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">${borcBaslik}</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">${alacakBaslik}</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Bakiye</th>
                    </tr>
            `;

            ekstreData.forEach(item => {
                tableHtml += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ddd;">${new Date(item.tarih).toLocaleDateString('tr-TR')}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.islemCinsi}</td>
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.aciklama || '-'}</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.abs(Number(item.borc || 0)).toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.abs(Number(item.alacak || 0)).toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; font-weight: bold;">${Math.abs(Number(item.yuruyenBakiye || 0)).toLocaleString('tr-TR')} ₺</td>
                    </tr>
                `;
            });

            tableHtml += `
                    <tr style="background-color: #fafafa; font-weight: bold;">
                        <td colspan="3" style="padding: 8px; border: 1px solid #ddd; text-align: right;">GENEL TOPLAM:</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.abs(Number(ekstreOzet.toplamBorc || 0)).toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${Math.abs(Number(ekstreOzet.toplamAlacak || 0)).toLocaleString('tr-TR')} ₺</td>
                        <td style="padding: 8px; border: 1px solid #ddd; text-align: right; color: ${ekstreOzet.bakiye !== 0 ? '#cf1322' : '#000'}">${Math.abs(Number(ekstreOzet.bakiye || 0)).toLocaleString('tr-TR')} ₺</td>
                    </tr>
                </table>
            `;

            const htmlContent = `
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Cari Ekstre</title>
                </head>
                <body style="padding: 20px;">
                    <h2 style="text-align: center; color: #333; font-family: Arial, sans-serif;">${seciliCari?.firmaAdi} - Cari Hesap Ekstresi</h2>
                    <p style="text-align: right; font-family: Arial, sans-serif; color: #666;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                    ${tableHtml}
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) { Alert.alert("Hata", "PDF oluşturulamadı."); }
    };

    const renderCari = ({ item }: any) => {
        const bakiye = Number(item.bakiye || 0);
        let bakiyeRenk = '#595959';
        let bakiyeBg = '#f0f0f0';

        if (bakiye > 0) { bakiyeRenk = '#cf1322'; bakiyeBg = '#fff1f0'; }
        else if (bakiye < 0) { bakiyeRenk = '#52c41a'; bakiyeBg = '#f6ffed'; }

        return (
            <View style={styles.card}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.firmaAdi}>{item.firmaAdi}</Text>
                    <Text style={styles.subText}>{item.kategori || 'Genel'} • {item.telefon || '-'}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.bakiyeTag, { backgroundColor: bakiyeBg }]}>
                        <Text style={{ color: bakiyeRenk, fontWeight: 'bold' }}>{Math.abs(bakiye).toLocaleString('tr-TR')} ₺</Text>
                    </View>
                    <TouchableOpacity style={styles.detayBtn} onPress={() => handleDetayGor(item)}>
                        <Text style={styles.detayBtnText}>Ekstre Gör ➔</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEkstreSatir = ({ item }: any) => {
        const borc = Math.abs(Number(item.borc || 0));
        const alacak = Math.abs(Number(item.alacak || 0));
        const bakiye = Number(item.yuruyenBakiye || 0);

        return (
            <View style={styles.ekstreCard}>
                <View style={styles.row}>
                    <Text style={styles.tarihText}>{new Date(item.tarih).toLocaleDateString('tr-TR')}</Text>
                    <Text style={styles.islemText}>{item.islemCinsi}</Text>
                </View>
                {item.aciklama ? <Text style={styles.aciklamaText}>{item.aciklama}</Text> : null}

                <View style={styles.tutarRow}>
                    <View style={styles.tutarCol}>
                        <Text style={styles.tutarLabel}>{borcBaslik}</Text>
                        <Text style={[styles.tutarValue, { color: borc > 0 ? (isTedarikci ? '#52c41a' : '#cf1322') : '#ccc' }]}>
                            {borc > 0 ? `${borc.toLocaleString('tr-TR')} ₺` : '-'}
                        </Text>
                    </View>
                    <View style={styles.tutarCol}>
                        <Text style={styles.tutarLabel}>{alacakBaslik}</Text>
                        <Text style={[styles.tutarValue, { color: alacak > 0 ? (isTedarikci ? '#cf1322' : '#52c41a') : '#ccc' }]}>
                            {alacak > 0 ? `${alacak.toLocaleString('tr-TR')} ₺` : '-'}
                        </Text>
                    </View>
                    <View style={[styles.tutarCol, { borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 10 }]}>
                        <Text style={styles.tutarLabel}>Bakiye</Text>
                        <Text style={[styles.tutarValue, { color: bakiye > 0 ? '#cf1322' : (bakiye < 0 ? '#52c41a' : '#000') }]}>
                            {bakiye === 0 ? '0 ₺' : `${Math.abs(bakiye).toLocaleString('tr-TR')} ₺`}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // 🚀 YENİ: Arama Filtresi
    const filteredCariler = cariler.filter(c =>
        c.firmaAdi?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.kategori?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <View style={styles.container}>

            {/* 🚀 YENİ: Arama Çubuğu */}
            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Firma Adı veya Kategori Ara..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            <FlatList
                data={filteredCariler}
                keyExtractor={(item) => item._id}
                renderItem={renderCari}
                refreshing={loading}
                onRefresh={fetchCariler}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={ // 🚀 YENİ: Boş Durum Tasarımı
                    !loading ? (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>📭</Text>
                            <Text style={{ color: '#888', fontSize: 16 }}>Kayıtlı firma bulunamadı.</Text>
                        </View>
                    ) : null
                }
            />

            {/* EKSTRE MODALI */}
            <Modal visible={isEkstreVisible} animationType="slide">
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{seciliCari?.firmaAdi}</Text>
                            <Text style={{ color: '#666' }}>Hesap Ekstresi</Text>
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
                                    <Text style={styles.ozetLabel}>Toplam {borcBaslik}</Text>
                                    <Text style={[styles.ozetValue, { color: isTedarikci ? '#52c41a' : '#cf1322' }]}>{Math.abs(Number(ekstreOzet.toplamBorc || 0)).toLocaleString('tr-TR')} ₺</Text>
                                </View>
                                <View style={styles.ozetItem}>
                                    <Text style={styles.ozetLabel}>Toplam {alacakBaslik}</Text>
                                    <Text style={[styles.ozetValue, { color: isTedarikci ? '#cf1322' : '#52c41a' }]}>{Math.abs(Number(ekstreOzet.toplamAlacak || 0)).toLocaleString('tr-TR')} ₺</Text>
                                </View>
                                <View style={[styles.ozetItem, { borderLeftWidth: 1, borderLeftColor: '#ddd', paddingLeft: 10 }]}>
                                    <Text style={styles.ozetLabel}>Kalan Bakiye</Text>
                                    <Text style={[styles.ozetValue, { color: ekstreOzet.bakiye > 0 ? '#cf1322' : (ekstreOzet.bakiye < 0 ? '#52c41a' : '#000'), fontSize: 16 }]}>
                                        {Math.abs(Number(ekstreOzet.bakiye || 0)).toLocaleString('tr-TR')} ₺
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

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 1 },
    firmaAdi: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    subText: { fontSize: 12, color: '#888' },
    bakiyeTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginBottom: 8, alignItems: 'center' },
    detayBtn: { backgroundColor: '#e6f7ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: '#91d5ff' },
    detayBtnText: { color: '#1890ff', fontSize: 12, fontWeight: 'bold' },

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