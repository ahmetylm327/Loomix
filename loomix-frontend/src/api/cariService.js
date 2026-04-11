import axiosInstance from "./axiosInstance";

export const getCariler = async () => {
    const response = await axiosInstance.get('/caris');
    return response.data;
};

export const addCari = async (data) => {
    const response = await axiosInstance.post('/caris', data);
    return response.data;
};

export const deleteCari = async (id) => {
    // Senin backend rotan /caris ise böyle kalmalı
    const response = await axiosInstance.delete(`/caris/${id}`);
    return response.data;
};

export const updateCari = async (id, data) => {
    const response = await axiosInstance.put(`/caris/${id}`, data);
    return response.data;
};