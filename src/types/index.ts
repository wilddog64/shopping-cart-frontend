// Product types
export interface Product {
  id: string
  name: string
  description: string
  price: number
  currency: string
  category: string
  imageUrl?: string
  stock: number
  createdAt: string
  updatedAt: string
}

export interface ProductCategory {
  id: string
  name: string
  description?: string
}

// Cart types
export interface CartItem {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subTotal: number
}

export interface Cart {
  id: string
  customerId: string
  items: CartItem[]
  totalAmount: number
  currency: string
  createdAt: string
  updatedAt: string
  expiresAt: string
}

export interface AddToCartRequest {
  productId: string
  name: string
  quantity: number
  unitPrice: number
}

export interface UpdateCartItemRequest {
  quantity: number
}

// Order types
export interface OrderItem {
  id: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  subTotal: number
}

export interface Order {
  id: string
  customerId: string
  items: OrderItem[]
  totalAmount: number
  currency: string
  status: OrderStatus
  shippingAddress?: Address
  createdAt: string
  updatedAt: string
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'

export type PaymentMethod = 'CARD' | 'BANK'

export type PaymentStatus = 'COMPLETED' | 'FAILED'

export interface Address {
  street: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface CreateOrderItem {
  productId: string
  productName: string
  quantity: number
  unitPrice: number
}

export interface CreateOrderRequest {
  customerId: string
  items: CreateOrderItem[]
  shippingAddress: Address
  currency: string
}

export interface UpdateOrderStatusRequest {
  status: Extract<OrderStatus, 'PAID'>
  paymentId: string
  paymentMethod: PaymentMethod
}

export interface PaymentRequest {
  orderId: string
  customerId: string
  amount: number
  currency: string
  gateway: 'mock'
  cardNumber?: string
  cardExpMonth?: string
  cardExpYear?: string
  cardCvc?: string
  cardholderName?: string
  idempotencyKey?: string
}

export interface PaymentResponse {
  id: string
  orderId: string
  status: PaymentStatus
  cardLast4?: string
  cardBrand?: string
  failureReason?: string
}

// API Response types
export interface ApiError {
  message: string
  code?: string
  details?: Record<string, string>
}

export interface PaginatedResponse<T> {
  data: T[]
  page: number
  pageSize: number
  totalItems: number
  totalPages: number
}

// User types
export interface User {
  id: string
  email: string
  name: string
  roles: string[]
}
