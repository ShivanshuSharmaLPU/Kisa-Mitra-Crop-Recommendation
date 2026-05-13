import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 15000 });

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
