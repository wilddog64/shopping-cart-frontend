import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Product, PaginatedResponse } from '@/types'

export interface GetProductsParams {
  page?: number
  pageSize?: number
  category?: string
  search?: string
}

export const productService = {
  async getProducts(params: GetProductsParams = {}): Promise<PaginatedResponse<Product>> {
    const { page = 1, pageSize = 12, category, search } = params
    const queryParams = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    })

    if (category) queryParams.append('category', category)
    if (search) queryParams.append('search', search)

    const response = await api.get<PaginatedResponse<Product>>(
      `${ENDPOINTS.PRODUCTS}?${queryParams}`
    )
    return response.data
  },

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<Product>(ENDPOINTS.PRODUCT_BY_ID(id))
    return response.data
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<string[]>(ENDPOINTS.PRODUCT_CATEGORIES)
    return response.data
  },
}
