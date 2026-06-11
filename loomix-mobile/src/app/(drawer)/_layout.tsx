import AsyncStorage from '@react-native-async-storage/async-storage';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { router } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Sol Menünün İçeriği (Sayfalar + Çıkış Yap Butonu)
function CustomDrawerContent(props: any) {
    const handleLogout = async () => {
        Alert.alert('Çıkış Yap', 'Hesabınızdan çıkmak istediğinize emin misiniz?', [
            { text: 'Vazgeç', style: 'cancel' },
            {
                text: 'Evet, Çıkış Yap',
                style: 'destructive',
                onPress: async () => {
                    await AsyncStorage.removeItem('loomix_token');
                    router.replace('/');
                }
            }
        ]);
    };

    return (
        <View style={{ flex: 1 }}>
            <DrawerContentScrollView {...props} contentContainerStyle={{ backgroundColor: '#0a192f', paddingTop: 40 }}>
                {/* Menü Üst Kısım (Profil) */}
                <View style={styles.header}>
                    <Text style={styles.logoText}>LOOMIX</Text>
                    <Text style={styles.subText}>ERP Yönetim Paneli</Text>
                </View>

                {/* Diğer Sayfaların Listesi */}
                <View style={{ flex: 1, backgroundColor: '#fff', paddingTop: 10 }}>
                    <DrawerItemList {...props} />
                </View>
            </DrawerContentScrollView>

            {/* Alt Kısım - Çıkış Yap Butonu */}
            <View style={styles.footer}>
                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                    <Text style={styles.logoutText}>🚪 Çıkış Yap</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

// Menünün Çatısı ve Sayfa Kayıtları
export default function DrawerLayout() {
    return (
        <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerStyle: { backgroundColor: '#0a192f' },
                headerTintColor: '#64ffda',
                drawerActiveBackgroundColor: '#e6f7ff',
                drawerActiveTintColor: '#1890ff',
                drawerInactiveTintColor: '#333',
                headerTitleAlign: 'center', // Başlığı tam ortaya hizaladık
                // 🚀 SİHİRLİ DOKUNUŞ: Klasör isminin (drawer) başlığa sızmasını kesin olarak engelledik
                title: 'LOOMIX ERP',
            }}
        >
            <Drawer.Screen
                name="dashboard"
                options={{
                    drawerLabel: '📊 Komuta Merkezi',
                    headerTitle: '📊 LOOMIX ERP' // Üst barda yazacak havalı başlık
                }} />
            <Drawer.Screen
                name="personel"
                options={{
                    drawerLabel: '👥 Personel Yönetimi',
                    headerTitle: '👥 Personel Listesi'
                }}
            />
            <Drawer.Screen
                name="urunler"
                options={{
                    drawerLabel: '📦 Stok ve Modeller',
                    headerTitle: '📦 Ürün Listesi'
                }}
            />
            <Drawer.Screen
                name="cariler"
                options={{
                    drawerLabel: '🏢 Cari Hesaplar',
                    headerTitle: '🏢 Cari Listesi'
                }}
            />
            <Drawer.Screen
                name="uretim"
                options={{
                    drawerLabel: '🏭 Üretim ve Fişler',
                    headerTitle: '🏭 Üretim Yönetimi'
                }}
            />
            <Drawer.Screen
                name="puantaj"
                options={{
                    drawerLabel: '⏱️ Puantaj Yükle',
                    headerTitle: '⏱️ Personel Mesai ve Puantaj'
                }}
            />
            <Drawer.Screen
                name="kasa"
                options={{
                    drawerLabel: '💰 Kasa ve Finans',
                    headerTitle: '💰 Şirket Finans Defteri'
                }}
            />
            <Drawer.Screen
                name="maas"
                options={{
                    drawerLabel: '💸 Maaş ve Bordro',
                    headerTitle: '💸 Haftalık Maaş Yönetimi'
                }}
            />
            <Drawer.Screen
                name="hareketler"
                options={{
                    drawerLabel: '🔄 Cari Hareketler',
                    headerTitle: '🔄 Müşteri & Tedarikçi Ekstreleri'
                }}
            />
            <Drawer.Screen
                name="raporlar"
                options={{
                    drawerLabel: '📋 Personel Raporları',
                    headerTitle: '📋 Personel Finansal Mizan'
                }}
            />
            <Drawer.Screen
                name="yapayzeka"
                options={{
                    drawerLabel: '🤖 AI Tahmin',
                    headerTitle: '🤖 Loomix Yapay Zeka'
                }}
            />
        </Drawer>
    );
}

const styles = StyleSheet.create({
    header: { padding: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(100, 255, 218, 0.2)', paddingBottom: 20 },
    logoText: { color: '#64ffda', fontSize: 24, fontWeight: 'bold' },
    subText: { color: '#a8dadc', fontSize: 12, marginTop: 5 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#f0f0f0', backgroundColor: '#fff' },
    logoutButton: { backgroundColor: '#fff1f0', padding: 15, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ffa39e' },
    logoutText: { color: '#cf1322', fontWeight: 'bold', fontSize: 16 }
});