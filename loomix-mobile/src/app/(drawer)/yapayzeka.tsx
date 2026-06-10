import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';

export default function YapayZekaScreen() {
    const [loading, setLoading] = useState(false);
    const [tahminVerisi, setTahminVerisi] = useState<any>(null);

    // Form State
    const [forecastPeriod, setForecastPeriod] = useState('gelecekAy');
    const [includeSeasonality, setIncludeSeasonality] = useState(true);

    // 🚀 GÜVENLİK: Backend'den null veya bozuk sayı gelirse ekranı çökertmemesi için koruma
    const safeFormat = (val: any) => {
        if (!val || isNaN(Number(val))) return "0";
        return Number(val).toLocaleString('tr-TR', { maximumFractionDigits: 2 });
    };

    const handleTahminOlustur = async () => {
        setLoading(true);
        setTahminVerisi(null);
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            const payload = {
                forecastPeriod,
                confidenceLevel: 95,
                includeSeasonality
            };

            const response = await axios.post('http://192.168.231.156:5000/api/estimates/ai-forecast', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setTahminVerisi(response.data);
        } catch (error: any) {
            if (error.response && error.response.status === 422) {
                Alert.alert("Uyarı", "Analiz için yeterli geçmiş veri bulunamadı! Lütfen sisteme daha fazla kasa ve üretim kaydı girin.");
            } else {
                Alert.alert("Hata", "Loomix AI tahmin motoru çalıştırılırken bir sorun oluştu.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* AI BAŞLIK KARTI */}
            <View style={styles.headerCard}>
                <Text style={styles.title}>🤖 Loomix AI Tahmin</Text>
                <Text style={styles.subTitle}>
                    Atölyenizin geçmiş verilerini ve sektörel trendleri analiz ederek şirketinizin gelecek projeksiyonunu çıkarır.
                </Text>

                <View style={styles.divider} />

                {/* TAHMİN PERİYODU SEÇİMİ */}
                <Text style={styles.label}>Tahmin Periyodu</Text>
                <View style={styles.periodContainer}>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === 'gelecekHafta' && styles.periodBtnActive]} onPress={() => setForecastPeriod('gelecekHafta')}>
                        <Text style={[styles.periodText, forecastPeriod === 'gelecekHafta' && styles.periodTextActive]}>1 Hafta</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === 'gelecekAy' && styles.periodBtnActive]} onPress={() => setForecastPeriod('gelecekAy')}>
                        <Text style={[styles.periodText, forecastPeriod === 'gelecekAy' && styles.periodTextActive]}>1 Ay</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.periodBtn, forecastPeriod === 'gelecekYıl' && styles.periodBtnActive]} onPress={() => setForecastPeriod('gelecekYıl')}>
                        <Text style={[styles.periodText, forecastPeriod === 'gelecekYıl' && styles.periodTextActive]}>1 Yıl</Text>
                    </TouchableOpacity>
                </View>

                {/* SEZON ANALİZİ SWITCH */}
                <View style={styles.switchRow}>
                    <View style={{ flex: 1, paddingRight: 10 }}>
                        <Text style={styles.label}>Mevsimsellik Etkisi (Sezon Analizi)</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>Bayram, sezon sonu gibi dönemleri hesaba katar.</Text>
                    </View>
                    <Switch
                        value={includeSeasonality}
                        onValueChange={setIncludeSeasonality}
                        trackColor={{ false: '#d9d9d9', true: '#b37feb' }}
                        thumbColor={includeSeasonality ? '#722ed1' : '#f4f3f4'}
                    />
                </View>

                {/* ANALİZ BUTONU */}
                <TouchableOpacity style={styles.aiButton} onPress={handleTahminOlustur} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.aiButtonText}>🎯 Yapay Zeka Analizini Başlat</Text>
                    )}
                </TouchableOpacity>
            </View>

            {/* YÜKLENİYOR DURUMU */}
            {loading && (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#722ed1" />
                    <Text style={styles.loadingText}>Loomix AI verilerinizi işliyor, lütfen bekleyin...</Text>
                </View>
            )}

            {/* SONUÇ KARTLARI */}
            {tahminVerisi && !loading && (
                <View style={styles.resultsContainer}>
                    <Text style={styles.resultTitle}>Analiz Sonuçları ({forecastPeriod === 'gelecekHafta' ? 'Önümüzdeki 7 Gün' : forecastPeriod === 'gelecekAy' ? 'Önümüzdeki 30 Gün' : 'Önümüzdeki 1 Yıl'})</Text>

                    <View style={styles.grid}>
                        <View style={[styles.statBox, { borderTopColor: '#1890ff', backgroundColor: '#e6f7ff' }]}>
                            <Text style={styles.statLabel}>📈 Tahmini Üretim</Text>
                            <Text style={[styles.statValue, { color: '#096dd9' }]}>{safeFormat(tahminVerisi.predictedProductionVolume)} Adet</Text>
                        </View>

                        <View style={[styles.statBox, { borderTopColor: '#52c41a', backgroundColor: '#f6ffed' }]}>
                            <Text style={styles.statLabel}>💰 Beklenen Gelir</Text>
                            <Text style={[styles.statValue, { color: '#3f8600' }]}>{safeFormat(tahminVerisi.estimatedGrossRevenue)} ₺</Text>
                        </View>

                        <View style={[styles.statBox, { borderTopColor: '#ff4d4f', backgroundColor: '#fff2f0' }]}>
                            <Text style={styles.statLabel}>📉 Tahmini Gider</Text>
                            <Text style={[styles.statValue, { color: '#cf1322' }]}>{safeFormat(tahminVerisi.projectedExpenses)} ₺</Text>
                        </View>

                        <View style={[styles.statBox, { borderTopColor: '#faad14', backgroundColor: '#fffbe6' }]}>
                            <Text style={styles.statLabel}>📊 Kâr Marjı Tahmini</Text>
                            <Text style={[styles.statValue, { color: '#ad8b00' }]}>{tahminVerisi.aiProfitMargin || "%0"}</Text>
                        </View>
                    </View>

                    {/* AI ANALİZ NOTU */}
                    <View style={styles.noteCard}>
                        <Text style={styles.noteTitle}>ℹ️ AI Analiz Notları</Text>
                        <Text style={{ fontSize: 11, color: '#888', fontWeight: 'bold', marginTop: 10 }}>MEVSİMSEL TREND</Text>
                        <Text style={styles.noteText}>
                            {tahminVerisi._ekstraAnalizler?.sezonTrendEtkisi || "Bu periyotta büyük bir dalgalanma veya ekstra mevsimsel etki beklenmemektedir. Normal üretim seyri öngörülüyor."}
                        </Text>
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 15, backgroundColor: '#f0f2f5' },

    headerCard: { backgroundColor: '#f9f0ff', padding: 20, borderRadius: 12, borderWidth: 1, borderColor: '#d3adf7', marginBottom: 20, elevation: 2 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#531dab', marginBottom: 8 },
    subTitle: { fontSize: 13, color: '#722ed1', lineHeight: 18 },
    divider: { height: 1, backgroundColor: '#d3adf7', marginVertical: 15 },

    label: { fontSize: 13, fontWeight: 'bold', color: '#531dab', marginBottom: 8 },

    periodContainer: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    periodBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: '#d3adf7' },
    periodBtnActive: { backgroundColor: '#722ed1', borderColor: '#722ed1' },
    periodText: { color: '#722ed1', fontWeight: 'bold' },
    periodTextActive: { color: '#fff' },

    switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25, backgroundColor: '#fff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#efdbff' },

    aiButton: { backgroundColor: '#722ed1', padding: 15, borderRadius: 8, alignItems: 'center', elevation: 3 },
    aiButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

    loadingContainer: { alignItems: 'center', paddingVertical: 40 },
    loadingText: { color: '#722ed1', marginTop: 15, fontWeight: 'bold' },

    resultsContainer: { paddingBottom: 30 },
    resultTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    statBox: { width: '48%', padding: 15, borderRadius: 10, borderTopWidth: 4, marginBottom: 15, elevation: 1 },
    statLabel: { fontSize: 12, fontWeight: 'bold', color: '#555', marginBottom: 8 },
    statValue: { fontSize: 18, fontWeight: 'bold' },

    noteCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderTopWidth: 4, borderTopColor: '#722ed1', elevation: 1 },
    noteTitle: { fontSize: 14, fontWeight: 'bold', color: '#333' },
    noteText: { fontSize: 13, color: '#555', marginTop: 5, lineHeight: 20 }
});