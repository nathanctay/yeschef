import { createFileRoute } from '@tanstack/react-router'
import { requireAuth } from '../server/auth'
import { listLogsForUser } from '../server/logs'
import LogRow from '../components/LogRow'

export const Route = createFileRoute('/logs/')({
  beforeLoad: async () => {
    const user = await requireAuth()
    return { user }
  },
  loader: async ({ context }) => {
    return await listLogsForUser({ data: { userId: context.user.id } })
  },
  component: LogsIndexPage,
})

function LogsIndexPage() {
  const logs = Route.useLoaderData()

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-[#1F2937] mb-6">My Diary</h1>

      {logs.length === 0 ? (
        <p className="text-[#6B7280] text-center py-16">
          You haven't logged any recipes yet
        </p>
      ) : (
        <div>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </div>
      )}
    </main>
  )
}
