import axios from 'axios';

  console.log("API URL:", import.meta.env.VITE_API_URL);

const api = axios.create({

  baseURL: import.meta.env.VITE_API_URL + '/api',
  timeout:30000
});

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('km_token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err?.response?.data || { message: err.message })
);

export default api;