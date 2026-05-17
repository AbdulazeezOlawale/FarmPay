import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    Accept: "application/json",
  },
});

// Request interceptor: Attach the token from the store/localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("farmpay_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: Global error handling
api.interceptors.response.use(
  (response) => response.data, // This returns the raw response body (the string for login)
  (error) => {
    // Handle 401 Unauthorized (e.g., token expired)
    if (error.response?.status === 401) {
      localStorage.removeItem("farmpay_token");
      localStorage.removeItem("farmpay_user");
      window.location.href = "/login"; // Force logout
    }
    return Promise.reject(error.response?.data || error.message);
  },
);

// Auth APIs
export const login = (data) => api.post("/auth/login", data);
export const register = (data) => api.post("/auth/register", data);

// Farmer Specific
export const completeProfile = (data) => api.post("/auth/farmer_profile", data);
export const getUserProfile = () => api.get("/auth/me"); // Assuming this exists

export const createRider = (data) => api.post("/admin/create-dispatch-rider", data)
export const getAllRiders = (data) => api.get(`/admin/dispatch-riders/details?page=${data.page}&per_page=${data.per_page}`);
export const assignRider = (data) => api.put(`/admin/assign-rider/${data.order_id}/${data.rider_id}?rider_status=busy`);

// all orders
export const getAllOrders = (data) => api.get(`/admin/orders/details?page=${data.page}&per_page=${data.per_page}`);

// all users
export const getAllUsers = (data) => api.get(`/admin/users/details?page=${data.page}&per_page=${data.per_page}`);
// all payment
export const getAllPayment = (data) => api.get(`/admin/payments/details?page=${data.page}&per_page=${data.per_page}`);

// farmers profile
export const getFarmersProfile = (data) => api.get(`/admin/farmer-profiles/details?page=${data.page}&per_page=${data.per_page}`);

// all products
export const getAllProducts = (data) => api.get(`/admin/products/details?page=${data.page}&per_page=${data.per_page}`);

// resolve dispute
export const getAllDisputes = (data) => api.get(`/admin/disputes?page=${data.page}&per_page=${data.per_page}`);
export const resolveDispute = (data) => api.put(`/admin/dispute/${data.disputeId}/resolve`, data.body);

// Rider APIs
export const getRiderOrders = () => api.get('/rider/rider/orders');
export const markOrderPickedUp = (orderId) => api.patch(`/rider/order/${orderId}/picked-up`);
export const confirmDelivery = (orderId, otp) => api.post(`/rider/confirm-delivery/${orderId}?otp=${otp}`);
export const toggleRiderStatus = (isAvailable) => api.post('/rider/status', { is_available: isAvailable });

// Buyer APIs
export const createOrder = (data) => api.post('/orders/create', data);
export const initiatePayment = (orderId) => api.post(`/payments/initiate/${orderId}`);
export const verifyPayment = (transactionRef) => api.post('/payments/verify', { transaction_ref: transactionRef });
export const scanDelivery = (orderId, imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  return api.post(`/orders/scan-delivery/${orderId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};
export const createReview = (data) => api.post('/reviews/', data);
export const getProductReviews = (productId) => api.get(`/reviews/product/${productId}`);

// Farmer APIs
export const getFarmerProfile = () => api.get('/auth/profile');
export const getMyProducts = () => api.get('/products/my-products');
export const uploadProduct = (formData) => api.post('/products/upload', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteProduct = (productId) => api.delete(`/products/${productId}`);

// Admin APIs
export const getAdminDashboardCounts = () => api.get('/admin/dashboard/counts');
export const verifyUser = (userId) => api.post(`/admin/verify_user/${userId}`);
export const getAvailableRiders = () => api.get('/admin/dispatch-riders');

// Rest of your APIs...
export default api;
