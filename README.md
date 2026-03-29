# yesChef

A social recipe platform inspired by Letterboxd. Log the recipes you've made, discover what others are cooking, organize your favorites into cookbooks, and follow cooks whose taste you trust.

## Concept

- **Recipe logs** are like diary entries — record when you made something, how it went, and any notes
- **Cookbooks** are like lists — curated collections you build over time
- **The explore feed** surfaces public recipes from the community
- **Profiles** show a cook's recipes, logs, and cookbooks

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [TanStack Start](https://tanstack.com/start) (SSR, file-based routing) |
| Router | TanStack Router v1 |
| UI | React 19, Tailwind CSS v4 |
| Database | [Supabase](https://supabase.com) (Postgres) |
| Auth | Supabase Auth (email/password) |
| Storage | Supabase Storage (recipe covers, cookbook covers, avatars) |
| Server functions | TanStack Start |
| Testing | Vitest, Testing Library |
| Linting/formatting | Biome |

## Project Structure

```
yesChef/
├── frontend/          # TanStack Start app (the main thing)
│   ├── src/
│   │   ├── routes/    # File-based routes (one file = one page)
│   │   ├── server/    # Server-only modules (never sent to browser)
│   │   ├── components/
│   │   └── lib/
│   └── package.json
├── supabase/
│   └── migrations/    # SQL migrations for the Postgres schema
└── docs/              # Design specs and implementation plans
```

## Running Locally

### Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io) (`npm install -g pnpm`)
- A [Supabase](https://supabase.com) project (free tier works)

### 1. Clone and install

```bash
git clone https://github.com/nathanctay/yeschef
cd yesChef/frontend
pnpm install
```

### 2. Configure environment

Create `frontend/.env.local`:

```env
VITE_SUPABASE_URL=https://<your-project>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

The `VITE_` prefixed variables are safe to expose to the browser. `SUPABASE_SERVICE_ROLE_KEY` is server-only and bypasses RLS — never expose it client-side.

### 3. Run migrations

Apply the schema to your Supabase project via the Supabase dashboard SQL editor, or using the Supabase CLI:

```bash
supabase db push
```

### 4. Configure Supabase

In your Supabase project settings:

- **Auth → Email**: disable "Confirm email" for local development (auto-confirm)
- **Storage**: create three public buckets named `recipe-covers`, `cookbook-covers`, and `avatars`

### 5. Start the dev server

```bash
cd frontend
pnpm dev
```

App runs at [http://localhost:3000](http://localhost:3000).

## Available Scripts

From the `frontend/` directory:

```bash
pnpm dev        # Start dev server on port 3000
pnpm build      # Production build
pnpm preview    # Preview production build locally
pnpm test       # Run tests with Vitest
pnpm lint       # Lint with Biome
pnpm check      # Lint + format check
```

## Key Conventions

- **Server functions** (`src/server/`) run exclusively on the server. They use the Supabase service role key and enforce access control explicitly via ownership checks — never expose these to the browser.
- **Route files** use TanStack Router's flat-file convention: `recipes.$id.edit.tsx` becomes `/recipes/$id/edit`. Index routes use `.index.tsx`.
- **Mutations** use `createServerFn({ method: 'POST' })` with a FormData or JSON input validator.
- **Auth** is enforced in route `beforeLoad` hooks and at the top of every mutating server function via `requireAuth()`.
