import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'https://loomix-backend.onrender.com/api',
    headers: { 'Content-Type': 'application/json' }
});

axiosInstance.interceptors.request.use(async (config) => {
    const token = await AsyncStorage.getItem('loomix_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default axiosInstance;