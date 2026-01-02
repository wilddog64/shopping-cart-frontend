import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { orderService, type GetOrdersParams } from '@/services/orderService'

export function useOrders(params: GetOrdersParams = {}) {
  const auth = useAuth()

  return useQuery({
    queryKey: ['orders', params],
    queryFn: () => orderService.getOrders(params),
    enabled: auth.isAuthenticated,
  })
}

export function useOrder(id: string) {
  const auth = useAuth()

  return useQuery({
    queryKey: ['order', id],
    queryFn: () => orderService.getOrderById(id),
    enabled: auth.isAuthenticated && !!id,
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => orderService.cancelOrder(id),
    onSuccess: (order) => {
      queryClient.setQueryData(['order', order.id], order)
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
