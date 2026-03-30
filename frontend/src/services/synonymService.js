// src/services/synonymService.js
import { api } from "./api";

const API_URL = "/synonyms";

const getAllSynonyms = async () => {
    const response = await api.get(API_URL);
    return response.data;
};

const createSynonym = async (synonymData) => {
    const response = await api.post(API_URL, synonymData);
    return response.data;
};

const updateSynonym = async (id, synonymData) => {
    const response = await api.put(`${API_URL}/${id}`, synonymData);
    return response.data;
};

const deleteSynonym = async (id) => {
    const response = await api.delete(`${API_URL}/${id}`);
    return response.data;
};

const synonymService = {
    getAllSynonyms,
    createSynonym,
    updateSynonym,
    deleteSynonym,
};

export default synonymService;
