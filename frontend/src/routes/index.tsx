import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { getSession } from '../server/auth'

export const Route = createFileRoute('/')({
  beforeLoad: async () => {
    const user = await getSession()
    if (user) throw redirect({ to: '/explore' })
  },
  component: LandingPage,
})

function LandingPage() {
  return (
    <main className="min-h-screen bg-[#FFFDF8] text-[#1F2937]">
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-6 py-20 text-center">
        <h1
          className="mb-4 text-6xl font-bold tracking-tight text-[#E53935] sm:text-7xl"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          yesChef
        </h1>
        <p className="mb-10 max-w-xl text-lg text-[#1F2937]/70 sm:text-xl">
          A recipe diary inspired by Letterboxd. Log what you cook, discover what
          others make, and build your culinary library.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/auth/signin"
            className="rounded-xl border-2 border-[#E53935] bg-[#E53935] px-8 py-3 text-base font-semibold text-white transition hover:bg-[#C62828] hover:border-[#C62828]"
          >
            Sign In
          </Link>
          <Link
            to="/auth/signup"
            className="rounded-xl border-2 border-[#E53935] bg-transparent px-8 py-3 text-base font-semibold text-[#E53935] transition hover:bg-[#E53935] hover:text-white"
          >
            Create Account
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-20">
        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              title: 'Log recipes you\'ve made',
              description:
                'Keep a personal diary of every dish you\'ve cooked — notes, ratings, and all.',
            },
            {
              title: 'Discover recipes from others',
              description:
                'Browse what the community is cooking and find your next inspiration.',
            },
            {
              title: 'Build your cookbooks',
              description:
                'Curate collections of recipes the way you\'d build a reading list.',
            },
          ].map(({ title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-[#F1E7DA] bg-white px-6 py-8"
            >
              <h2 className="mb-2 text-base font-semibold text-[#1F2937]">{title}</h2>
              <p className="text-sm text-[#1F2937]/60">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}
