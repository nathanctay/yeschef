import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Header } from '../components/Header'
import { Footer } from '../components/Footer'
import { getSession } from '../server/auth'
import appCss from '../styles.css?url'

const queryClient = new QueryClient()

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'yesChef' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  loader: async () => {
    const rawUser = await getSession()
    const user = rawUser
      ? {
          id: rawUser.id,
          displayName: (rawUser.user_metadata?.display_name as string | undefined) ?? null,
        }
      : null
    return { user }
  },
  notFoundComponent: () => (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Page not found</h1>
      <p style={{ color: '#6B7280' }}>The page you&apos;re looking for doesn&apos;t exist.</p>
    </div>
  ),
  shellComponent: RootDocument,
  component: RootLayout,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="font-sans antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}

function RootLayout() {
  const { user } = Route.useLoaderData()
  return (
    <QueryClientProvider client={queryClient}>
      <Header user={user} />
      <Outlet />
      <Footer />
    </QueryClientProvider>
  )
}
