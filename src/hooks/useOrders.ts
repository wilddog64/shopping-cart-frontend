import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from 'react-oidc-context'
import { orderService, type GetOrdersParams } from '@/services/orderService'

export function useOrders(params: GetOrdersParams = {}) {
  const auth = useAuth()
  const customerId = auth.user?.profile?.sub

  return useQuery({
    queryKey: ['orders', params, customerId],
    queryFn: () => orderService.getOrders({ ...params, customerId }),
    enabled: auth.isAuthenticated && !!customerId,
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
