import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Uyarı', 'Kullanıcı adı ve şifre boş bırakılamaz!');
      return;
    }

    setLoading(true);
    try {
      // 1. Senin Render API'ne istek atıyoruz
      const response = await axios.post('https://loomix-backend.onrender.com/api/auth/login', {
        username: username,
        password: password
      });

      // 2. Gelen Token'ı telefonun hafızasına (Kasanın içine) saklıyoruz
      await AsyncStorage.setItem('loomix_token', response.data.token);

      // 3. Başarılı mesajı gösterip Personel sayfasına yönlendiriyoruz
      Alert.alert('Başarılı', response.data.mesaj || 'Sisteme giriş yapıldı!', [
        { text: 'Tamam', onPress: () => router.replace('/(drawer)/dashboard') }
      ]);

    } catch (error: any) {
      console.error('Login Hatası:', error);
      const errorMsg = error.response?.data?.mesaj || 'Giriş yapılamadı! Bilgilerinizi kontrol edin.';
      Alert.alert('Giriş Başarısız', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.logoText}>LOOMIX ERP</Text>
        <Text style={styles.subtitle}>Veri Yönetim Sistemi</Text>

        <TextInput
          style={styles.input}
          placeholder="Kullanıcı Adı"
          placeholderTextColor="#a8dadc"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Şifre"
          placeholderTextColor="#a8dadc"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#0a192f" />
          ) : (
            <Text style={styles.buttonText}>SİSTEME GİRİŞ 🚀</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a192f', // Web'deki koyu lacivert arka plan
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(23, 42, 69, 0.8)', // Yarı saydam kart
    padding: 30,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
  },
  logoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#64ffda', // Neon yeşil detay
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#a8dadc',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: 'rgba(10, 25, 47, 0.6)',
    borderWidth: 1,
    borderColor: 'rgba(100, 255, 218, 0.2)',
    borderRadius: 10,
    color: '#fff',
    padding: 15,
    marginBottom: 15,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#64ffda', // Canlı buton rengi
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#0a192f',
    fontSize: 16,
    fontWeight: 'bold',
  }
});