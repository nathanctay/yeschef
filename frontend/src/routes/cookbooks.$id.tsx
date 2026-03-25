import { createFileRoute, Outlet } from '@tanstack/react-router'
import { requireAuth } from '../server/auth'

export const Route = createFileRoute('/cookbooks/$id')({
  beforeLoad: async () => {
    await requireAuth()
  },
  component: () => <Outlet />,
})
