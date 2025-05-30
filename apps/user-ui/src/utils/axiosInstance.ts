import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_SERVER_URI,
    withCredentials: true,  
})

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

// Handle logout and prevent infinite loops

const handleLogout = () => {
    if (window.location.pathname !== '/login') {
        window.location.href = "/login";
    }
}

// Handle adding a new access token to queued requests

const subscribeTokenRefresh = (callback: () => void) => {
    refreshSubscribers.push(callback);
}

// Execute all queued requests after refresh

const onRefreshSuccess = () => {
    refreshSubscribers.forEach((callback) => callback());
    refreshSubscribers = [];
}

// Handle API requests

axiosInstance.interceptors.request.use(
    (config) => config,
    (error) => Promise.reject(error)
)

// Handle Expired tokens and refresh logic
axiosInstance.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        //prevent infinite loops
        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve) => {
                    subscribeTokenRefresh(() => resolve(axiosInstance(originalRequest)))
                })
            }
            originalRequest._retry = true;
            isRefreshing = true;
            try {
                await axios.post(`${process.env.NEXT_PUBLIC_SERVER_URI}/api/refresh-token-user`, {}, { withCredentials: true });

                isRefreshing = false;
                onRefreshSuccess();

                return axiosInstance(originalRequest);  
            } catch (err) {
                isRefreshing = false;
                refreshSubscribers = [];
                handleLogout();
                return Promise.reject(err);
            }
        }
        return Promise.reject(error);
    }
)

export default axiosInstance;