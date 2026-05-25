import api from './api'
import { ENDPOINTS } from '@/config/api'
import type { Product, PaginatedResponse } from '@/types'

export interface GetProductsParams {
  page?: number
  pageSize?: number
  category?: string
  search?: string
  q?: string
}

function mapProduct(p: Record<string, unknown>): Product {
  return {
    id: String(p.id),
    name: String(p.name),
    description: String(p.description ?? ''),
    price: Number(p.price ?? 0),
    currency: String(p.currency ?? 'USD'),
    category: String(p.category ?? ''),
    imageUrl: p.image_url ? String(p.image_url) : undefined,
    stock: Number(p.quantity ?? 0),
    createdAt: String(p.created_at ?? ''),
    updatedAt: String(p.updated_at ?? ''),
  }
}

export const productService = {
  async getProducts(params: GetProductsParams = {}): Promise<PaginatedResponse<Product>> {
    const { page = 1, pageSize = 12, category, search, q } = params
    const queryParams = new URLSearchParams({
      page: String(page),
      page_size: String(pageSize),
    })

    const searchTerm = q ?? search
    if (category) queryParams.append('category', category)
    if (searchTerm) queryParams.append('q', searchTerm)

    const response = await api.get<Record<string, unknown>>(`${ENDPOINTS.PRODUCTS}?${queryParams}`)
    const raw = response.data as {
      items: Array<Record<string, unknown>>
      total: number
      page: number
      page_size: number
      pages: number
    }
    return {
      data: raw.items.map(mapProduct),
      page: raw.page,
      pageSize: raw.page_size,
      totalItems: raw.total,
      totalPages: raw.pages,
    }
  },

  async getProductById(id: string): Promise<Product> {
    const response = await api.get<Record<string, unknown>>(ENDPOINTS.PRODUCT_BY_ID(id))
    const p = response.data as Record<string, unknown>
    return {
      id: String(p.id),
      name: String(p.name),
      description: String(p.description ?? ''),
      price: Number(p.price ?? 0),
      currency: String(p.currency ?? 'USD'),
      category: String(p.category ?? ''),
      imageUrl: p.image_url ? String(p.image_url) : undefined,
      stock: Number(p.quantity ?? 0),
      createdAt: String(p.created_at ?? ''),
      updatedAt: String(p.updated_at ?? ''),
    }
  },

  async getCategories(): Promise<string[]> {
    const response = await api.get<string[]>(ENDPOINTS.PRODUCT_CATEGORIES)
    return response.data
  },
}
