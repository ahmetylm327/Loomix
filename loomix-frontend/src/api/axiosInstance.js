import axios from "axios";

const axiosInstance = axios.create({
    // baseURL: 'https://loomix-xlp4.onrender.com/api', 
    baseURL: 'https://loomix-backend.onrender.com/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default axiosInstance;
