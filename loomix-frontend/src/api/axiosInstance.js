import axios from "axios";

const axiosInstance = axios.create({
    baseURL: 'https://loomix-backend.onrender.com/api',
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

// Her istekte localStorage'daki token'ı header'a ekle
axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('loomix_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// 401 alınca login sayfasına yönlendir
axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('loomix_token');
            window.location.href = '/#/login';
        }
        return Promise.reject(error);
    }
);

export default axiosInstance;