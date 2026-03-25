## YesChef Design Specification

### Goals

- Deliver an MVP recipe social site with a clear navigation model and strong core interactions:
  - add recipes (manual + URL import)
  - view recipes
  - like, comment, fork
  - organize in cookbooks with per-cookbook covers and private-by-default sharing
- provide an explore feed that includes recipes outside cookbooks (using recipe visibility + follows)

### Non-Goals (initially)

- Perfectly extracting recipes from every URL, including paywalled content
- Threaded comments (only flat comment list for phase 1)
- Full moderation tooling
- Full personalization / recommendation algorithm (phase 2)

### UI Theme (picnic blanket)

The UI will use a red + white base with subtle accents, evoking a picnic blanket:

- Background: `#FFFDF8` (off-white)
- Primary red: `#E53935`
- Border: `#F1E7DA` (warm light border)
- Card shadow: `rgba(229, 57, 53, 0.12)` (subtle red-tint)
- Button red fill: `#E53935`
- Button hover red fill: `#CC332F`
- Text: `#1F2937`
- Muted text: `#6B7280`

Component styling principles:

- Cards: slightly rounded corners with a thin warm border
- Buttons:
  - `primary`: red fill, white text
  - `secondary`: white fill with red border and red text
- Images: consistently rounded corners and a subtle shadow
- Cookbook covers: either a color swatch or an image with a faint pattern overlay

### Routing and Pages

Primary routes (TanStack Router):

- `/` Home Explore
  - featured recipe hero (carousel or single highlight)
  - recipe feed cards with pagination (Phase 1 ranking: follows first, then most likes)
- `/recipes/new` Add Recipe
  - manual form and URL import panel
- `/recipes/:id` Recipe Detail
  - recipe content
  - like/unlike
  - fork action
  - comment list and comment composer
- `/cookbooks` All Cookbooks (cards grid)
- `/cookbooks/:id` Cookbook Detail
  - cookbook header with cover
  - list of recipes in that cookbook
- `/cookbooks/new` Create Cookbook
  - name, optional description, cover style/color/image
- `/profile` User Profile (recommended for phase 1 UX)
  - user recipes and cookbooks

For each page, define loading and empty states:

- Loading: skeletons on cards/sections
- Empty: helpful “create your first …” CTA
- Error: inline error banner with retry where safe

### Data Model (Supabase / Postgres)

All “owner” fields are enforced by Supabase Row Level Security (RLS) and by the API layer.

#### Core structured content types

Recipe content is stored as JSONB to support evolving structures.

`content_json` (jsonb) shape (phase 1):

```ts
type RecipeContentJson = {
  ingredients: Array<{
    id?: string
    text: string
  }>
  steps: Array<{
    id?: string
    text: string
  }>
  variations?: Array<{
    id?: string
    title?: string
    ingredients?: Array<{ id?: string; text: string }>
    steps?: Array<{ id?: string; text: string }>
    notes?: string
  }>
  notes?: string
}
```

Notes:

- `id` fields are optional on import to reduce coupling; the app may assign stable client IDs during editing
- Variations and notes are optional to keep manual entry lightweight

#### Tables

`profiles`
- `id` (uuid, PK, references `auth.users(id)`)
- `display_name` (text)
- `avatar_url` (text, nullable)
- `created_at` (timestamp)

`recipes`
- `id` (uuid, PK)
- `owner_id` (uuid, references `profiles(id)`)
- `visibility` (text, values: `private` | `followers` | `public`)
- `source_type` (text, values: `manual` | `url`)
- `source_url` (text, nullable)
- `title` (text)
- `description` (text, nullable)
- `cover_image_path` (text, nullable) (Supabase Storage path)
- `content_json` (jsonb)
- `forked_from_recipe_id` (uuid, nullable, references `recipes(id)`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

Fork semantics:

- The fork is a new recipe row owned by the forking user
- `forked_from_recipe_id` links to the parent recipe row
- Editing the fork never mutates the parent

`recipe_likes`
- `id` (uuid, PK)
- `user_id` (uuid, references `profiles(id)`)
- `recipe_id` (uuid, references `recipes(id)`)
- `created_at` (timestamp)
- Unique constraint: `(user_id, recipe_id)`

`recipe_comments`
- `id` (uuid, PK)
- `user_id` (uuid, references `profiles(id)`)
- `recipe_id` (uuid, references `recipes(id)`)
- `body` (text)
- `created_at` (timestamp)
- `updated_at` (timestamp)

`cookbooks`
- `id` (uuid, PK)
- `owner_id` (uuid, references `profiles(id)`)
- `name` (text)
- `description` (text, nullable)
- `cover_style` (text, values: `color` | `image`)
- `cover_color` (text, nullable) (when `cover_style = color`)
- `cover_image_path` (text, nullable) (when `cover_style = image`)
- `visibility` (text, values: `private` | `shared`)
  - Phase 1 does not include public cookbooks; add later if desired
- `created_at` (timestamp)
- `updated_at` (timestamp)

`cookbook_members`
- `cookbook_id` (uuid, references `cookbooks(id)`)
- `user_id` (uuid, references `profiles(id)`)
- `role` (text, values: `reader` | `editor`)
- Unique constraint: `(cookbook_id, user_id)`

Phase 1 sharing mechanism:

- Owners manage member rows in `cookbook_members`
- Cookbook visibility is effectively:
  - `private`: owner + members only
  - `shared`: owner + members only
  - (We can add “public” later without changing table shape by adding a new visibility value.)

`cookbook_recipes`
- `cookbook_id` (uuid, references `cookbooks(id)`)
- `recipe_id` (uuid, references `recipes(id)`)
- `sort_order` (int, default 0)
- Unique constraint: `(cookbook_id, recipe_id)`

`user_follows`
- `follower_id` (uuid, references `profiles(id)`)
- `following_id` (uuid, references `profiles(id)`)
- `created_at` (timestamp)
- Unique constraint: `(follower_id, following_id)`

### Supabase RLS Policy Goals

Policies must match the intended visibility rules:

1. Users can always see and mutate their own content
2. Recipe visibility to other users is determined by recipe visibility (public/followers) and cookbook access (phase 1)
3. Likes and comments are visible only when the user can view the recipe

#### Recipe visibility model (phase 1)

We will treat recipes as viewable when:

- The viewer is the owner, OR
- The recipe is included in a cookbook that the viewer can read (owned cookbook or member of that cookbook), OR
- `recipes.visibility = 'public'`, OR
- `recipes.visibility = 'followers'` AND the viewer follows the recipe owner

Implementation detail:

- Queries for recipe lists (explore feed and cookbook feeds) should be backed by database views or API-level join filters that align with RLS policies.

#### Policy summary by table

`profiles`
- SELECT: allow reading profiles for existing users (or limit as needed)
- UPDATE: allow users to update their own profile row

`recipes`
- SELECT:
  - allow owner read
  - allow non-owner read if any of the following are true:
    - recipe.visibility = 'public'
    - recipe.visibility = 'followers' AND viewer follows owner
    - recipe is present in a cookbook readable by viewer
- INSERT:
  - require `owner_id = auth.uid()`
- UPDATE/DELETE:
  - allow only owner

`recipe_likes`
- SELECT: allow when viewer can read the target recipe
- INSERT/DELETE: allow only for rows where `user_id = auth.uid()`

`recipe_comments`
- SELECT: allow when viewer can read the target recipe
- INSERT: allow only for `user_id = auth.uid()`
- UPDATE/DELETE: allow only comment owner

`cookbooks`
- SELECT: allow owner read; allow member read based on `cookbook_members`
- INSERT: allow only owner creates their own cookbook
- UPDATE/DELETE: allow only owner or editor (editability rules decided by role)

`cookbook_members`
- SELECT: allow owner read; allow member read for their own membership if needed
- INSERT/DELETE/UPDATE:
  - allow only cookbook owner to manage membership

`cookbook_recipes`
- SELECT: allow when viewer can read the cookbook
- INSERT/DELETE/UPDATE:
  - allow only owner/editor based on `cookbook_members.role`

### Backend API Contracts (Bun)

Transport is HTTP with JSON bodies. The API layer enforces auth, input validation, and upload/import safety.

#### Response envelope (recommended)

Standardize API responses:

```ts
type ApiResponse<T> = {
  ok: true
  data: T
} | {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}
```

#### Authentication

- `POST /auth/session` (optional)
  - If we rely fully on Supabase client-side token handling, this may be skipped.
- In phase 1, API routes will validate Supabase JWT from `Authorization: Bearer <token>`.

#### Recipes

- `GET /recipes/explore`
  - Query:
    - `cursor` (optional)
    - `limit` (default 20, max 50)
    - `mode` (optional, default `forYou`)
  - Returns:
    - `recipes`: list of recipe cards (id, title, cover, like count, comment count, owner, etc.)
    - `nextCursor`

Phase 1 ranking:
- prioritize recipes owned by users the viewer follows
- then sort remaining accessible recipes by like count (descending), with pagination by cursor

- `GET /recipes/:id`
  - Returns:
    - recipe detail (content_json)
    - `viewerHasLiked`
    - likes count
    - latest comments (first page) and `commentCount`

- `POST /recipes`
  - Body:
    - title, description
    - cover image (optional via multipart upload or separate endpoint)
    - content_json fields: ingredients, steps, variations, notes
  - Returns: created recipe

- `POST /recipes/import-url`
  - Body:
    - `url` (string)
  - Returns:
    - `jobId`

- `GET /recipes/import-url/:jobId`
  - Returns:
    - status: `queued` | `running` | `succeeded` | `failed`
    - if succeeded: created `recipeId`
    - if failed: structured diagnostics for user editing

- `POST /recipes/:id/like`
  - Creates like

- `DELETE /recipes/:id/like`
  - Removes like

- `POST /recipes/:id/comments`
  - Body:
    - `body`

- `POST /recipes/:id/fork`
  - Creates a fork copy in viewer’s account
  - Returns: new `forkedRecipeId`

#### Cookbooks

- `GET /cookbooks`
  - Returns:
    - cookbooks visible to viewer cards (cover, name, description, counts)

- `POST /cookbooks`
  - Body:
    - name, description (optional)
    - cover_style + cover_color or cover_image upload
    - visibility (default `private`)

- `GET /cookbooks/:id`
  - Returns:
    - cookbook detail
    - member role for viewer (optional)
    - list of recipes in cookbook (cards)

- `POST /cookbooks/:id/recipes`
  - Body:
    - `recipeId`
    - `sortOrder` (optional)

- `POST /cookbooks/:id/share`
  - Body:
    - `userId` or `email` (phase decision)
    - role: `reader` | `editor`

### URL Import Pipeline (Hybrid, Paywall-Aware by Best-Effort)

The import feature must work “for any site” in the sense that:

- it attempts extraction on a wide range of websites
- it degrades gracefully when parsing fails
- it does not rely on paid third-party extractors unless absolutely necessary

#### Job lifecycle

- User submits URL to `POST /recipes/import-url`
- Backend creates a job row (or in-memory job if prototype) and returns `jobId`
- Backend runs async extraction with strict timeouts
- On success, backend creates a recipe row owned by the viewer and returns `recipeId`
- On failure, backend stores diagnostics accessible via `GET /recipes/import-url/:jobId`

#### Extraction flow

Attempt 1: HTTP fetch + reader-mode parsing

- Fetch URL HTML with user-agent and timeouts
- Extract visible text using DOM cleanup
- Attempt to identify:
  - title (meta tags + h1/h2 heuristics)
  - ingredients (common headings like “Ingredients”)
  - steps (common headings like “Directions” / “Method”)
  - description/summary (lead paragraphs)
  - notes/variations if structured hints exist

Attempt 2: Playwright rendering + retry

- Render the page in a headless browser
- Retry extraction on:
  - rendered DOM text
  - JSON-LD recipe schema when present
- Re-run the same heuristic mapping to `content_json`

Failure handling

- If extraction fails:
  - return structured diagnostics (what was found, what was missing)
  - store best-effort title/description if available
  - allow user to complete/edit manually after import job fails

#### Safety limits

- Max URL length and validation (scheme allowlist: http/https)
- Rate limiting per user and per IP
- Request timeouts (connect/read) and overall job timeouts
- Maximum response size / DOM size cap
- Sanitization/normalization of extracted text before saving

### Recipe Forking Semantics

Fork action `POST /recipes/:id/fork`:

- Auth required
- Ensure parent recipe exists
- Create new recipe row with:
  - copied `title`, `description`, `cover_image_path` (optional copy)
  - copied `content_json`
  - `forked_from_recipe_id = parent.id`
  - new `owner_id = auth.uid()`
  - `source_type = manual` or `url` depending on parent (document choice; for phase 1, `source_type = manual` is acceptable)

### Editing and Uploads

Phase 1 uploads for covers are supported by:

- Option A: multipart upload endpoint for images to Supabase Storage
- Option B: direct-to-Storage via Supabase client (recommended for simpler backend)

The design doc should define whichever approach we choose during implementation.

