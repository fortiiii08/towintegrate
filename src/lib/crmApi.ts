import axios from 'axios';

const CRM_API_URL = import.meta.env.VITE_CRM_API_URL || 'http://localhost:3002';

const crmApi = axios.create({
  baseURL: `${CRM_API_URL}/api`,
});

crmApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('crm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

crmApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('crm_token');
      localStorage.removeItem('crm_user');
      window.location.href = '/trafego';
    }
    return Promise.reject(err);
  }
);

export default crmApi;
