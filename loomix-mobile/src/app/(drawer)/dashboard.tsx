import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

export default function DashboardScreen() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Para formatlama (Sayısal işlemleri koruyarak)
    const formatPara = (val: any) => {
        const num = Number(val);
        return isNaN(num) ? "0,00" : num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const fetchStats = async () => {
        try {
            const token = await AsyncStorage.getItem('loomix_token');
            if (!token) return Alert.alert("Hata", "Oturum süresi dolmuş. Lütfen tekrar giriş yapın.");

            const res = await axios.get('http://192.168.231.156:5000/api/stats', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStats(res.data);
        } catch (error) {
            console.error("Dashboard yüklenemedi", error);
            Alert.alert("Hata", "Dashboard verileri çekilemedi.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchStats(); }, []);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        fetchStats();
    }, []);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#1890ff" />
                <Text style={{ marginTop: 12, color: '#888' }}>Komuta merkezi yükleniyor...</Text>
            </View>
        );
    }

    const netVarlik = (stats?.netKasa || 0) + (stats?.toplamAlacak || 0) - (stats?.toplamBorc || 0);

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
            <View style={styles.header}>
                <Text style={styles.title}>Loomix Komuta Merkezi</Text>
                <Text style={styles.subtitle}>Güncel operasyonel durum.</Text>
            </View>

            {/* SAYAÇLAR (Grid Yapısı) */}
            <View style={styles.gridContainer}>
                <View style={[styles.gridItem, { borderLeftColor: '#1890ff' }]}><Text style={styles.cardTitle}>Aktif Personel</Text><Text style={[styles.cardValue, { color: '#1890ff' }]}>👥 {stats?.personelSayisi || 0}</Text></View>
                <View style={[styles.gridItem, { borderLeftColor: '#52c41a' }]}><Text style={styles.cardTitle}>Aktif Müşteri</Text><Text style={[styles.cardValue, { color: '#52c41a' }]}>🏪 {stats?.cariSayisi || 0}</Text></View>
                <View style={[styles.gridItem, { borderLeftColor: '#faad14' }]}><Text style={styles.cardTitle}>Stok Model</Text><Text style={[styles.cardValue, { color: '#faad14' }]}>📦 {stats?.urunSayisi || 0}</Text></View>
                <View style={[styles.gridItem, { borderLeftColor: '#f5222d' }]}><Text style={styles.cardTitle}>Net Kasa</Text><Text style={[styles.cardValue, { color: '#f5222d' }]}>{formatPara(stats?.netKasa || 0)} ₺</Text></View>
            </View>

            {/* ÖZEL İSTATİSTİK KARTLARI */}
            <View style={[styles.fullCard, { backgroundColor: '#f9f0ff', borderLeftColor: '#722ed1' }]}>
                <Text style={styles.cardTitle}>Piyasadaki Alacak</Text>
                <Text style={[styles.cardValue, { color: '#722ed1' }]}>{formatPara(stats?.toplamAlacak || 0)} ₺</Text>
            </View>

            <View style={[styles.fullCard, { backgroundColor: '#f6ffed', borderLeftColor: '#52c41a', paddingVertical: 20 }]}>
                <Text style={styles.cardTitle}>Şirket Net Varlığı</Text>
                <Text style={[styles.cardValue, { color: '#52c41a', fontSize: 24 }]}>🌍 {formatPara(netVarlik)} ₺</Text>
            </View>

            {/* SON İŞLEMLER */}
            <View style={styles.listSection}>
                <Text style={styles.sectionTitle}>Son Finansal İşlemler</Text>
                {stats?.sonIslemler?.map((islem: any, index: number) => (
                    <View key={index} style={styles.islemCard}>
                        <View style={styles.islemLeft}>
                            <View style={[styles.islemIcon, { backgroundColor: islem.islemYonu === 'Gelir' ? '#f6ffed' : '#fff1f0' }]}>
                                <Text style={{ fontSize: 18 }}>{islem.islemYonu === 'Gelir' ? '📈' : '📉'}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.islemKategori} numberOfLines={1}>{islem.kategori || 'Genel İşlem'}</Text>
                                <Text style={styles.islemNot} numberOfLines={1}>{islem.notlar || '-'}</Text>
                            </View>
                        </View>
                        <Text style={[styles.islemTutar, { color: islem.islemYonu === 'Gelir' ? '#52c41a' : '#f5222d' }]}>
                            {islem.islemYonu === 'Gelir' ? '+' : '-'}{formatPara(islem.tutar)} ₺
                        </Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f2f5', padding: 15 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { marginBottom: 20 },
    title: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 13, color: '#888', marginTop: 4 },
    gridContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
    gridItem: { backgroundColor: '#fff', width: '47%', padding: 15, borderRadius: 10, borderLeftWidth: 4, marginBottom: 15, elevation: 1 },
    fullCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, borderLeftWidth: 4, marginBottom: 15, elevation: 1 },
    cardTitle: { fontSize: 11, color: '#666', fontWeight: 'bold', marginBottom: 5 },
    cardValue: { fontSize: 16, fontWeight: 'bold' },
    listSection: { marginTop: 10, marginBottom: 40 },
    sectionTitle: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    islemCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 12, borderRadius: 10, marginBottom: 10, elevation: 1 },
    islemLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    islemIcon: { width: 35, height: 35, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    islemKategori: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    islemNot: { fontSize: 11, color: '#888' },
    islemTutar: { fontSize: 14, fontWeight: 'bold' }
});