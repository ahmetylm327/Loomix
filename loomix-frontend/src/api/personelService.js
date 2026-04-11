import axiosInstance from "./axiosInstance";

// Tüm personelleri getir (GET)
export const getPersoneller = async () => {
    const response = await axiosInstance.get('/employees');
    return response.data;
};

// Yeni personel ekle (POST)
export const addPersonel = async (data) => {
    const response = await axiosInstance.post('/employees', data);
    return response.data;
};

// Personel sil (DELETE) - ID'ye göre
export const deletePersonel = async (id) => {
    const response = await axiosInstance.delete(`/employees/${id}`);
    return response.data;
};

// Personel güncelle (PUT) - ID'ye göre
export const updatePersonel = async (id, data) => {
    const response = await axiosInstance.put(`/employees/${id}`, data);
    return response.data;
};