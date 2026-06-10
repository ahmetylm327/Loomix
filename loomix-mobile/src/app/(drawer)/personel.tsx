import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function PersonelScreen() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState(''); // 🚀 YENİ: Arama filtresi

    // ÇOKLU SEÇİM (TOPLU ÖDEME İÇİN)
    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // MODAL STATE'LERİ
    const [activeActionEmployee, setActiveActionEmployee] = useState<any>(null);
    const [isActionSheetVisible, setIsActionSheetVisible] = useState(false);

    const [isModalVisible, setIsModalVisible] = useState(false); // Ekle/Düzenle
    const [editingEmployee, setEditingEmployee] = useState<any>(null);

    const [isPayModalVisible, setIsPayModalVisible] = useState(false); // Ödeme
    const [payAmount, setPayAmount] = useState('');

    const [isRefundModalVisible, setIsRefundModalVisible] = useState(false); // İade
    const [refundAmount, setRefundAmount] = useState('');

    const [isTahakkukModalVisible, setIsTahakkukModalVisible] = useState(false); // Tahakkuk
    const [periodType, setPeriodType] = useState('Haftalık');
    const [calisilanGun, setCalisilanGun] = useState('6');

    const [isEkstreVisible, setIsEkstreVisible] = useState(false); // Ekstre
    const [ekstreData, setEkstreData] = useState<any[]>([]);
    const [ekstreLoading, setEkstreLoading] = useState(false);

    // FORM STATE
    const [form, setForm] = useState({ adSoyad: '', pozisyon: '', ucretTipi: 'Günlük', ucretMiktari: '', telefon: '' });

    // 🚀 GÜVENLİK: Virgüllü sayı girişlerini noktaya çeviren yardımcı fonksiyon
    const safeNumber = (val: any) => {
        if (!val) return 0;
        return Number(val.toString().replace(',', '.')) || 0;
    };

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const response = await axios.get('http://192.168.231.156:5000/api/employees', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
        } catch (error) { Alert.alert("Hata", "Personel listesi alınamadı!"); }
        finally { setLoading(false); }
    };

    // EKLE / GÜNCELLE
    const handleSave = async () => {
        if (!form.adSoyad || !form.ucretMiktari) return Alert.alert("Uyarı", "Ad Soyad ve Ücret zorunludur.");
        const cleanUcret = safeNumber(form.ucretMiktari);
        if (cleanUcret <= 0) return Alert.alert("Hata", "Geçerli bir ücret miktarı giriniz.");

        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const headers = { Authorization: `Bearer ${token}` };
            const payload = { ...form, ucretMiktari: cleanUcret };

            if (editingEmployee) {
                const id = editingEmployee.employeeId || editingEmployee._id;
                await axios.put(`http://192.168.231.156:5000/api/employees/${id}`, payload, { headers });
                Alert.alert("Başarılı", "Personel güncellendi!");
            } else {
                await axios.post('http://192.168.231.156:5000/api/employees', payload, { headers });
                Alert.alert("Başarılı", "Personel eklendi!");
            }
            setIsModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert("Hata", "Kayıt işlemi başarısız."); }
    };

    // SİL
    const handleDelete = (id: string) => {
        Alert.alert("Emin misiniz?", "Bu personeli silmek istediğinize emin misiniz? Bu işlem geri alınamaz.", [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Sil", style: "destructive", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        await axios.delete(`http://192.168.231.156:5000/api/employees/${id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        fetchData();
                        setIsActionSheetVisible(false);
                    } catch (error) { Alert.alert("Hata", "Silme işlemi başarısız."); }
                }
            }
        ]);
    };

    // ÖDEME YAP
    const handlePayment = async () => {
        const cleanAmount = safeNumber(payAmount);
        if (cleanAmount <= 0) return Alert.alert("Uyarı", "Geçerli bir tutar girin.");
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const id = activeActionEmployee.employeeId || activeActionEmployee._id;
            await axios.post(`http://192.168.231.156:5000/api/employees/${id}/pay`, { miktar: cleanAmount }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert("Başarılı", `${cleanAmount} ₺ ödeme yapıldı!`);
            setIsPayModalVisible(false);
            setPayAmount('');
            fetchData();
        } catch (error) { Alert.alert("Hata", "Ödeme yapılamadı."); }
    };

    // İADE AL
    const handleRefund = async () => {
        const cleanAmount = safeNumber(refundAmount);
        if (cleanAmount <= 0) return Alert.alert("Uyarı", "Geçerli bir tutar girin.");
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const id = activeActionEmployee.employeeId || activeActionEmployee._id;
            await axios.post(`http://192.168.231.156:5000/api/employees/${id}/refund`, { miktar: cleanAmount }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert("Başarılı", `${cleanAmount} ₺ tahsil edildi!`);
            setIsRefundModalVisible(false);
            setRefundAmount('');
            fetchData();
        } catch (error) { Alert.alert("Hata", "İade alınamadı."); }
    };

    // MANUEL TAHAKKUK
    const handleTahakkukSubmit = async () => {
        const cleanGun = safeNumber(calisilanGun);
        if (cleanGun <= 0) return Alert.alert("Uyarı", "Çalışılan gün/saat sıfırdan büyük olmalıdır.");
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const id = activeActionEmployee.employeeId || activeActionEmployee._id;
            await axios.post(`http://192.168.231.156:5000/api/payroll/${id}/calculate`, {
                period_type: periodType,
                calisilanGunManuel: cleanGun
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            Alert.alert("Başarılı", "Tahakkuk başarıyla eklendi!");
            setIsTahakkukModalVisible(false);
            fetchData();
        } catch (error) { Alert.alert("Hata", "Tahakkuk oluşturulamadı."); }
    };

    // TOPLU ÖDEME
    const handleBulkPayment = () => {
        Alert.alert("Toplu Ödeme", `Seçili ${selectedIds.length} personelin içerideki TÜM bakiyeleri sıfırlanıp "Ödendi" olarak işaretlenecek. Onaylıyor musunuz?`, [
            { text: "Vazgeç", style: "cancel" },
            {
                text: "Evet, Hepsini Öde", onPress: async () => {
                    try {
                        const token = await AsyncStorage.getItem('loomix_token');
                        const res = await axios.post('http://192.168.231.156:5000/api/employees/bulk-pay', { personelIds: selectedIds }, {
                            headers: { Authorization: `Bearer ${token}` }
                        });
                        Alert.alert("Başarılı", `Toplam ${res.data.odenen} ₺ ödendi!`);
                        setSelectedIds([]);
                        setSelectionMode(false);
                        fetchData();
                    } catch (error: any) { Alert.alert("Hata", error.response?.data?.mesaj || "Toplu ödeme başarısız!"); }
                }
            }
        ]);
    };

    // EKSTRE ÇEK
    const fetchEkstre = async (personel: any) => {
        setIsActionSheetVisible(false);
        setIsEkstreVisible(true);
        setEkstreLoading(true);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const id = personel.employeeId || personel._id;
            const res = await axios.get(`http://192.168.231.156:5000/api/employees/${id}/ekstre`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEkstreData(res.data);
        } catch (error) {
            Alert.alert("Hata", "Ekstre alınamadı!");
            setIsEkstreVisible(false);
        } finally {
            setEkstreLoading(false);
        }
    };

    // EXCEL (CSV) ÇIKTISI
    const exportEkstreExcel = async () => {
        if (!ekstreData || ekstreData.length === 0) return Alert.alert("Uyarı", "İndirilecek veri yok!");
        try {
            const basliklar = ["Tarih", "Islem Cinsi", "Aciklama", "TL Borc", "TL Alacak", "Bakiye"];
            const satirlar = ekstreData.map(item => {
                const tarih = new Date(item.islemTarihi).toLocaleDateString('tr-TR');
                const islem = item.islemTipi === 'Hakediş' ? 'Tahakkuk' : item.islemTipi;
                const aciklama = (item.aciklama || '-').replace(/;/g, ' ');
                const borc = isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0;
                const alacak = isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0;
                return `${tarih};${islem};${aciklama};${borc};${alacak};${item.bakiyeSonrasi || 0}`;
            });

            const csvIcerik = "\uFEFF" + basliklar.join(';') + '\n' + satirlar.join('\n');
            const dosyaYolu = FileSystem.documentDirectory + `${activeActionEmployee?.adSoyad.replace(/[^a-zA-Z0-9]/g, '_')}_Ekstre.csv`;

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
                    <tr style="background-color: #595959; color: white;">
                        <th style="padding: 8px; border: 1px solid #ddd;">Tarih</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Evrak Cinsi</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Açıklama</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Ödenen (Borç)</th>
                        <th style="padding: 8px; border: 1px solid #ddd;">Hakediş (Alacak)</th>
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
                        <td style="padding: 8px; border: 1px solid #ddd;">${item.islemTipi === 'Hakediş' ? 'Tahakkuk (+)' : item.islemTipi}</td>
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
                    <h2 style="text-align: center; color: #333; font-family: Arial, sans-serif;">${activeActionEmployee?.adSoyad} - Cari Hesap Ekstresi</h2>
                    <p style="text-align: right; font-family: Arial, sans-serif; color: #666;">Tarih: ${new Date().toLocaleDateString('tr-TR')}</p>
                    ${tableHtml}
                </body>
                </html>
            `;

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        } catch (error) { Alert.alert("Hata", "PDF oluşturulamadı."); }
    };

    // YARDIMCI FONKSİYONLAR
    const isBorc = (islemTipi: string) => islemTipi === 'Ödeme' || islemTipi === 'Avans';
    const isAlacak = (islemTipi: string) => islemTipi === 'Hakediş' || islemTipi === 'Avans İadesi' || islemTipi === 'Prim';

    const openActionSheet = (employee: any) => {
        if (selectionMode) {
            const id = employee.employeeId || employee._id;
            if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(i => i !== id));
            else setSelectedIds([...selectedIds, id]);
            return;
        }
        setActiveActionEmployee(employee);
        setIsActionSheetVisible(true);
    };

    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedIds([]);
    };

    // İSTATİSTİKLER
    const toplamIceridekiPara = data.filter(d => d.bakiye > 0).reduce((acc, curr) => acc + (curr.bakiye || 0), 0);
    const saatlikCalisanSayisi = data.filter(d => d.ucretTipi === 'Saatlik' || d.wage_type === 'Hourly').length;
    const gunlukCalisanSayisi = data.length - saatlikCalisanSayisi;

    // 🚀 YENİ: Arama Filtresi
    const filteredPersoneller = data.filter(p =>
        (p.adSoyad || p.fullname || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.pozisyon || p.position || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    // KART RENDER
    const renderPersonel = ({ item }: any) => {
        const id = item.employeeId || item._id;
        const bakiye = item.bakiye || item.balance || 0;
        const ucret = item.ucretMiktari || item.daily_wage || 0;
        const tip = item.ucretTipi || (item.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük');
        const isSelected = selectedIds.includes(id);

        let bakiyeEtiket = "Bakiye Sıfır";
        let bakiyeRenk = "#888";
        let bakiyeBg = "#f0f0f0";

        if (bakiye > 0) { bakiyeEtiket = `Şirket Borçlu: ${bakiye} ₺`; bakiyeRenk = "#cf1322"; bakiyeBg = "#fff1f0"; }
        else if (bakiye < 0) { bakiyeEtiket = `Personel Borçlu: ${Math.abs(bakiye)} ₺`; bakiyeRenk = "#52c41a"; bakiyeBg = "#f6ffed"; }

        return (
            <TouchableOpacity
                style={[styles.card, selectionMode && isSelected && { borderColor: '#1890ff', borderWidth: 2 }]}
                onPress={() => openActionSheet(item)}
            >
                <View style={{ flex: 1 }}>
                    <Text style={styles.isim}>{item.adSoyad || item.fullname}</Text>
                    <Text style={styles.pozisyon}>{item.pozisyon || item.position}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 }}>
                        <Text style={[styles.ucretTag, { backgroundColor: tip === 'Saatlik' ? '#f9f0ff' : '#e6fffb', color: tip === 'Saatlik' ? '#722ed1' : '#13c2c2' }]}>
                            {tip}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#555', fontWeight: 'bold' }}>{ucret} ₺</Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    {selectionMode ? (
                        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                            {isSelected && <Text style={{ color: '#fff', fontSize: 12 }}>✓</Text>}
                        </View>
                    ) : (
                        <Text style={{ fontSize: 24, color: '#ccc', paddingBottom: 10 }}>⚙️</Text>
                    )}
                    <View style={[styles.bakiyeKutu, { backgroundColor: bakiyeBg }]}>
                        <Text style={{ color: bakiyeRenk, fontWeight: 'bold', fontSize: 11 }}>{bakiyeEtiket}</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* ÜST İSTATİSTİK KARTLARI */}
            <View style={styles.statsRow}>
                <View style={[styles.statBox, { borderTopColor: '#1890ff' }]}>
                    <Text style={styles.statTitle}>Aktif Personel</Text>
                    <Text style={styles.statValue}>{data.length}</Text>
                    <Text style={styles.statSub}>{saatlikCalisanSayisi} Saatlik • {gunlukCalisanSayisi} Günlük</Text>
                </View>
                <View style={[styles.statBox, { borderTopColor: '#cf1322' }]}>
                    <Text style={styles.statTitle}>Toplam İçerideki Para</Text>
                    <Text style={[styles.statValue, { color: '#cf1322' }]}>{toplamIceridekiPara.toLocaleString('tr-TR')} ₺</Text>
                    <Text style={styles.statSub}>Şirketin personele borcu</Text>
                </View>
            </View>

            {/* 🚀 YENİ: ARAMA ÇUBUĞU */}
            <View style={styles.searchContainer}>
                <Text style={{ fontSize: 16, marginRight: 10 }}>🔍</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Personel Adı veya Pozisyon Ara..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {/* AKSİYON BUTONLARI */}
            <View style={styles.actionRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#1890ff' }]} onPress={() => { setEditingEmployee(null); setForm({ adSoyad: '', pozisyon: '', ucretTipi: 'Günlük', ucretMiktari: '', telefon: '' }); setIsModalVisible(true); }}>
                    <Text style={{ color: '#fff', fontWeight: 'bold' }}>+ Yeni Ekle</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: selectionMode ? '#555' : '#fff', borderWidth: 1, borderColor: '#ddd' }]} onPress={toggleSelectionMode}>
                    <Text style={{ color: selectionMode ? '#fff' : '#333', fontWeight: 'bold' }}>{selectionMode ? 'Seçimi İptal Et' : '☑️ Toplu Öde'}</Text>
                </TouchableOpacity>
            </View>

            <FlatList
                data={filteredPersoneller}
                keyExtractor={(item) => item.employeeId || item._id}
                renderItem={renderPersonel}
                refreshing={loading}
                onRefresh={fetchData}
                contentContainerStyle={{ paddingBottom: 80 }}
                ListEmptyComponent={ // 🚀 YENİ: Boş Durum Tasarımı
                    !loading ? (
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ fontSize: 40, marginBottom: 10 }}>👥</Text>
                            <Text style={{ color: '#888', fontSize: 16 }}>Personel bulunamadı.</Text>
                        </View>
                    ) : null
                }
            />

            {/* TOPLU ÖDEME BARI */}
            {selectionMode && selectedIds.length > 0 && (
                <View style={styles.bulkPayBar}>
                    <Text style={{ color: '#333', fontWeight: 'bold' }}>{selectedIds.length} Kişi Seçildi</Text>
                    <TouchableOpacity style={{ backgroundColor: '#52c41a', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 }} onPress={handleBulkPayment}>
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Seçilenleri Öde</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ACTION SHEET (PERSONEL İŞLEMLERİ) */}
            <Modal visible={isActionSheetVisible} transparent animationType="slide">
                <TouchableOpacity style={styles.actionSheetOverlay} activeOpacity={1} onPress={() => setIsActionSheetVisible(false)}>
                    <View style={styles.actionSheetContent}>
                        <Text style={styles.actionSheetTitle}>{activeActionEmployee?.adSoyad}</Text>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => { setIsActionSheetVisible(false); setIsTahakkukModalVisible(true); }}>
                            <Text style={{ fontSize: 16, color: '#1890ff' }}>➕ Manuel Tahakkuk (Puantaj İşle)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => { setIsActionSheetVisible(false); setIsPayModalVisible(true); }}>
                            <Text style={{ fontSize: 16, color: '#cf1322' }}>💸 Avans veya Maaş Öde</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => { setIsActionSheetVisible(false); setIsRefundModalVisible(true); }}>
                            <Text style={{ fontSize: 16, color: '#52c41a' }}>↩️ Avans İadesi Al</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => fetchEkstre(activeActionEmployee)}>
                            <Text style={{ fontSize: 16, color: '#fa8c16' }}>📄 Detaylı Hesap Ekstresi</Text>
                        </TouchableOpacity>

                        <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 10 }} />

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => {
                            setIsActionSheetVisible(false);
                            setEditingEmployee(activeActionEmployee);
                            setForm({
                                adSoyad: activeActionEmployee.adSoyad || activeActionEmployee.fullname,
                                pozisyon: activeActionEmployee.pozisyon || activeActionEmployee.position,
                                ucretTipi: activeActionEmployee.ucretTipi || (activeActionEmployee.wage_type === 'Hourly' ? 'Saatlik' : 'Günlük'),
                                ucretMiktari: (activeActionEmployee.ucretMiktari || activeActionEmployee.daily_wage).toString(),
                                telefon: activeActionEmployee.telefon || activeActionEmployee.phoneNumber
                            });
                            setIsModalVisible(true);
                        }}>
                            <Text style={{ fontSize: 16, color: '#333' }}>✏️ Bilgileri Düzenle</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => handleDelete(activeActionEmployee?.employeeId || activeActionEmployee?._id)}>
                            <Text style={{ fontSize: 16, color: '#ff4d4f', fontWeight: 'bold' }}>🗑️ Personeli Sil</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* EKLE/DÜZENLE MODALI */}
            <Modal visible={isModalVisible} animationType="slide">
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalView}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <Text style={styles.modalTitle}>{editingEmployee ? 'Personeli Düzenle' : 'Yeni Personel Ekle'}</Text>

                        <Text style={styles.label}>Ad Soyad</Text>
                        <TextInput style={styles.input} value={form.adSoyad} onChangeText={t => setForm({ ...form, adSoyad: t })} />

                        <Text style={styles.label}>Pozisyon / Görev</Text>
                        <TextInput style={styles.input} value={form.pozisyon} onChangeText={t => setForm({ ...form, pozisyon: t })} />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Ücret Tipi</Text>
                                <View style={{ flexDirection: 'row', gap: 5 }}>
                                    <TouchableOpacity style={[styles.typeBtn, form.ucretTipi === 'Günlük' && styles.typeBtnActive]} onPress={() => setForm({ ...form, ucretTipi: 'Günlük' })}><Text style={{ color: form.ucretTipi === 'Günlük' ? '#fff' : '#666' }}>Günlük</Text></TouchableOpacity>
                                    <TouchableOpacity style={[styles.typeBtn, form.ucretTipi === 'Saatlik' && styles.typeBtnActive]} onPress={() => setForm({ ...form, ucretTipi: 'Saatlik' })}><Text style={{ color: form.ucretTipi === 'Saatlik' ? '#fff' : '#666' }}>Saatlik</Text></TouchableOpacity>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>Ücret (₺)</Text>
                                <TextInput style={styles.input} keyboardType="decimal-pad" value={form.ucretMiktari} onChangeText={t => setForm({ ...form, ucretMiktari: t })} />
                            </View>
                        </View>

                        <Text style={styles.label}>Telefon (Opsiyonel)</Text>
                        <TextInput style={styles.input} keyboardType="phone-pad" value={form.telefon} onChangeText={t => setForm({ ...form, telefon: t })} />

                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Kaydet</Text></TouchableOpacity>
                        <TouchableOpacity onPress={() => setIsModalVisible(false)} style={{ alignItems: 'center', marginTop: 15 }}><Text style={{ color: '#999' }}>Vazgeç</Text></TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>

            {/* ÖDEME YAP MODALI */}
            <Modal visible={isPayModalVisible} transparent animationType="fade">
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>💸 Ödeme Yap</Text>
                        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 15 }}>{activeActionEmployee?.adSoyad} adlı personele ödeme yapıyorsunuz. (Kasadan para çıkar)</Text>
                        <TextInput style={[styles.input, { fontSize: 24, textAlign: 'center', color: '#cf1322', fontWeight: 'bold' }]} keyboardType="decimal-pad" placeholder="0" value={payAmount} onChangeText={setPayAmount} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#ddd' }]} onPress={() => setIsPayModalVisible(false)}><Text style={{ color: '#333' }}>İptal</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#cf1322' }]} onPress={handlePayment}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Öde</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* İADE AL MODALI */}
            <Modal visible={isRefundModalVisible} transparent animationType="fade">
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>↩️ İade Al</Text>
                        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 15 }}>Personel şirkete para iadesi yapıyor. (Kasaya para girer)</Text>
                        <TextInput style={[styles.input, { fontSize: 24, textAlign: 'center', color: '#52c41a', fontWeight: 'bold' }]} keyboardType="decimal-pad" placeholder="0" value={refundAmount} onChangeText={setRefundAmount} />
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#ddd' }]} onPress={() => setIsRefundModalVisible(false)}><Text style={{ color: '#333' }}>İptal</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#52c41a' }]} onPress={handleRefund}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Tahsil Et</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* TAHAKKUK MODALI */}
            <Modal visible={isTahakkukModalVisible} transparent animationType="fade">
                <View style={styles.miniModalOverlay}>
                    <View style={styles.miniModalContent}>
                        <Text style={styles.miniModalTitle}>➕ Manuel Tahakkuk</Text>
                        <Text style={{ textAlign: 'center', color: '#666', marginBottom: 10 }}>Personele maaş/hakediş yansıt.</Text>

                        <Text style={styles.label}>Periyot</Text>
                        <View style={{ flexDirection: 'row', gap: 5, marginBottom: 15 }}>
                            <TouchableOpacity style={[styles.typeBtn, periodType === 'Haftalık' && styles.typeBtnActive]} onPress={() => setPeriodType('Haftalık')}><Text style={{ color: periodType === 'Haftalık' ? '#fff' : '#666' }}>Haftalık</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.typeBtn, periodType === 'Aylık' && styles.typeBtnActive]} onPress={() => setPeriodType('Aylık')}><Text style={{ color: periodType === 'Aylık' ? '#fff' : '#666' }}>Aylık</Text></TouchableOpacity>
                        </View>

                        <Text style={styles.label}>Çalışılan Gün / Saat</Text>
                        <TextInput style={[styles.input, { fontSize: 20, textAlign: 'center', fontWeight: 'bold' }]} keyboardType="decimal-pad" value={calisilanGun} onChangeText={setCalisilanGun} />

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#ddd' }]} onPress={() => setIsTahakkukModalVisible(false)}><Text style={{ color: '#333' }}>İptal</Text></TouchableOpacity>
                            <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: '#1890ff' }]} onPress={handleTahakkukSubmit}><Text style={{ color: '#fff', fontWeight: 'bold' }}>Tahakkuk Et</Text></TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* EKSTRE MODALI */}
            <Modal visible={isEkstreVisible} animationType="slide">
                <View style={styles.modalView}>
                    <View style={styles.modalHeaderRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.modalTitle} numberOfLines={1}>{activeActionEmployee?.adSoyad}</Text>
                            <Text style={{ color: '#666' }}>Hesap Ekstresi</Text>
                        </View>
                        <TouchableOpacity style={{ padding: 5 }} onPress={() => setIsEkstreVisible(false)}>
                            <Text style={{ fontSize: 20 }}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    {/* EXCEL / PDF BUTONLARI EKLENDİ */}
                    <View style={styles.exportRow}>
                        <TouchableOpacity style={[styles.exportBtn, { borderColor: '#52c41a', backgroundColor: '#f6ffed' }]} onPress={exportEkstreExcel}>
                            <Text style={{ color: '#52c41a', fontWeight: 'bold' }}>📊 Excel'e Aktar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.exportBtn, { borderColor: '#cf1322', backgroundColor: '#fff1f0' }]} onPress={exportEkstrePDF}>
                            <Text style={{ color: '#cf1322', fontWeight: 'bold' }}>📄 PDF İndir</Text>
                        </TouchableOpacity>
                    </View>

                    {ekstreLoading ? <ActivityIndicator size="large" color="#1890ff" style={{ marginTop: 50 }} /> : (
                        <FlatList
                            data={ekstreData}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={{ paddingBottom: 50, paddingTop: 10 }}
                            renderItem={({ item }) => {
                                const borc = isBorc(item.islemTipi) ? Math.abs(item.tutar) : 0;
                                const alacak = isAlacak(item.islemTipi) ? Math.abs(item.tutar) : 0;
                                const bakiye = Number(item.bakiyeSonrasi || 0);
                                return (
                                    <View style={styles.ekstreCard}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                                            <Text style={{ fontSize: 12, color: '#888', fontWeight: 'bold' }}>{new Date(item.islemTarihi).toLocaleDateString('tr-TR')}</Text>
                                            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#333' }}>{item.islemTipi === 'Hakediş' ? 'Tahakkuk (+)' : (item.islemTipi === 'Ödeme' ? 'Tediye Fişi (-)' : item.islemTipi)}</Text>
                                        </View>
                                        {item.aciklama ? <Text style={{ fontSize: 12, color: '#666', fontStyle: 'italic', marginBottom: 10 }}>{item.aciklama}</Text> : null}
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 }}>
                                            <View style={{ flex: 1 }}><Text style={{ fontSize: 10, color: '#888' }}>Ödenen (Borç)</Text><Text style={{ fontSize: 13, fontWeight: 'bold', color: borc > 0 ? '#cf1322' : '#ccc' }}>{borc > 0 ? `${borc.toLocaleString('tr-TR')} ₺` : '-'}</Text></View>
                                            <View style={{ flex: 1 }}><Text style={{ fontSize: 10, color: '#888' }}>Hakediş (Alacak)</Text><Text style={{ fontSize: 13, fontWeight: 'bold', color: alacak > 0 ? '#52c41a' : '#ccc' }}>{alacak > 0 ? `${alacak.toLocaleString('tr-TR')} ₺` : '-'}</Text></View>
                                            <View style={{ flex: 1, borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 10 }}><Text style={{ fontSize: 10, color: '#888' }}>Bakiye</Text><Text style={{ fontSize: 13, fontWeight: 'bold', color: bakiye > 0 ? '#cf1322' : (bakiye < 0 ? '#3f8600' : '#000') }}>{bakiye.toLocaleString('tr-TR')} ₺</Text></View>
                                        </View>
                                    </View>
                                );
                            }}
                        />
                    )}
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 10, backgroundColor: '#f0f2f5' },

    // 🚀 YENİ ARAMA ÇUBUĞU STİLLERİ
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#ddd' },
    searchInput: { flex: 1, fontSize: 15, color: '#333' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    statBox: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 8, borderTopWidth: 4, elevation: 1 },
    statTitle: { fontSize: 11, color: '#888', fontWeight: 'bold', marginBottom: 5 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#1890ff' },
    statSub: { fontSize: 10, color: '#999', marginTop: 5 },

    actionRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },

    card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, flexDirection: 'row', alignItems: 'center', elevation: 1 },
    isim: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    pozisyon: { fontSize: 12, color: '#888', marginTop: 2 },
    ucretTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },
    bakiyeKutu: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 5 },

    checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    checkboxSelected: { backgroundColor: '#1890ff', borderColor: '#1890ff' },

    bulkPayBar: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#fff', padding: 15, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 5, borderWidth: 1, borderColor: '#1890ff' },

    actionSheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    actionSheetContent: { backgroundColor: '#fff', padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    actionSheetTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },
    actionSheetBtn: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },

    modalView: { flex: 1, padding: 20, paddingTop: 50, backgroundColor: '#fff' },
    modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    label: { fontSize: 12, color: '#555', marginBottom: 6, fontWeight: 'bold', marginTop: 10 },
    input: { backgroundColor: '#f9f9f9', borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16 },
    typeBtn: { flex: 1, padding: 12, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center' },
    typeBtnActive: { backgroundColor: '#1890ff', borderColor: '#1890ff' },
    saveBtn: { backgroundColor: '#1890ff', padding: 15, alignItems: 'center', borderRadius: 8, marginTop: 20 },

    miniModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
    miniModalContent: { backgroundColor: '#fff', padding: 20, borderRadius: 12, elevation: 5 },
    miniModalTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },

    modalHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
    ekstreCard: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 1, borderWidth: 1, borderColor: '#eee' },
    exportRow: { flexDirection: 'row', paddingBottom: 15, gap: 10, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
    exportBtn: { flex: 1, padding: 10, borderRadius: 6, borderWidth: 1, alignItems: 'center' },
});