import axios from "axios";

const axiosInstance = axios.create({
    // baseURL: 'https://loomix-xlp4.onrender.com/api', 
    baseURL: 'http://localhost:9000/api',
    headers: {
        'Content-Type': 'application/json'
    }
});

export default axiosInstance;