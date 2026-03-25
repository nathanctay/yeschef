## YesChef Plan and Delivery Phases

### Summary

YesChef is a recipe social site where users can:

- Create recipes manually or import from a URL
- Share recipes with the community
- Like recipes and comment on them
- Fork recipes (copy semantics) into their own account
- Organize recipes into cookbooks, with per-cookbook cover styling

### Tech Stack

- Frontend: Vanilla React + TypeScript
- Routing: TanStack Router (file-route convention)
- Backend: Bun runtime + TypeScript (API + background jobs)
- Database: Supabase (Postgres)
- Storage: Supabase Storage for recipe images and cookbook covers
- Auth: Supabase Auth (email + password for phase 1)

### Core Requirements (locked)

1. Fork semantics (copy semantics)
   - Fork creates a new independent recipe row owned by the forking user
   - The forked recipe stores `forked_from_recipe_id` referencing the parent
   - Updates on the fork do not affect the parent recipe

2. Cookbook privacy model
   - Cookbooks are private by default
   - Users can share cookbooks with specific other users
   - Only visible recipes should be browsable in cookbook/recipe views based on that model

3. URL-to-recipe ingestion
   - Hybrid approach
     - Best-effort “reader mode” extraction from fetched HTML
     - If parsing fails (script-heavy sites, dynamic content), retry using Playwright rendering
     - If we still fail, return structured diagnostics and let the user edit manually
   - Avoid paid third-party extraction services unless absolutely needed

### Pages (phase 1)

- Home explore page
  - Featured recipe hero/carousel
  - Personalized-ish feed of recipe cards (tastes + follows)
- Add recipe page
  - Manual form
  - URL import panel
- Recipe detail page
  - Recipe content, like/fork actions, comments, and comment composer
- All cookbooks page
  - Cookbook cards (color or image cover), name, and brief description
- Single cookbook page
  - Cookbook header + list of recipes inside

### Feature Phasing

#### Phase 1 MVP (build “the working product”)

- Auth
  - Email + password signup/signin
  - Client session integration with Supabase
- Recipes
  - Manual recipe creation with structured content
  - Recipe detail view
  - Like/unlike
  - Comments (create + list)
  - Fork (copy semantics)
- Cookbooks
  - Create cookbooks with cover style (color or image)
  - Add recipes to cookbooks
  - Cookbook private-by-default behavior
  - Sharing mechanism (owner shares with users; shared members can view)
- Discovery (explore feed)
  - Show recipes outside cookbooks using recipe-level visibility
  - Phase 1 recommendation rule: prioritize recipes from users you follow, then fall back to most liked among recipes you can access

#### Phase 2 (enhance discovery and ingestion)

- URL import pipeline implementation + job status UI
- Featured recipe selection (carousel/hero)
- “For You” tastes ranking (Phase 2)
- Search and stronger moderation controls

### Deliverables in this project

- `docs/PLAN.md` (this document)
- `docs/DESIGN.md` (detailed architecture + data model + API contracts + UI spec)
- `docs/ERD.md` (Mermaid ERD for core entities/relationships)

