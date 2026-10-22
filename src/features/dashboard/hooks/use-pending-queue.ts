import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { getPendingQueue } from '../api/dashboard'

export function usePendingQueue(status: string, page: number, pageSize = 5) {
  return useQuery({
    queryKey: ['dashboard', 'pending-queue', status, page, pageSize],
    queryFn: () => getPendingQueue(status, page, pageSize),
    placeholderData: keepPreviousData,
  })
}
