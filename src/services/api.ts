import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { getAccessToken } from '@/config/auth'
import type { ApiError } from '@/types'

export const GUEST_CART_TOKEN_KEY = 'guest-cart-token'

// Create axios instance
const api: AxiosInstance = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    const guestToken = localStorage.getItem(GUEST_CART_TOKEN_KEY)
    if (guestToken) config.headers['X-Cart-Token'] = guestToken
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    const guestToken = response.headers['x-cart-token']
    if (guestToken) localStorage.setItem(GUEST_CART_TOKEN_KEY, guestToken)
    return response
  },
  (error: AxiosError<ApiError>) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, could trigger re-auth here
      console.error('Authentication error:', error.response.data)
    }

    const message = error.response?.data?.message || error.message || 'An error occurred'
    return Promise.reject(new Error(message))
  }
)

export default api
