import axios from "axios";

const axiosInstance = axios.create({
    // ☁️ CANLI (CLOUD) BAĞLANTISI - GitHub'a gönderilecek olan ana (main) ayar
    baseURL: 'https://loomix-backend.onrender.com/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('loomix_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        // Login ve logout isteklerinde yönlendirme yapma
        const url = error.config?.url || '';
        if (error.response?.status === 401 && !url.includes('/auth/')) {
            localStorage.removeItem('loomix_token');
            window.location.href = '/#/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;