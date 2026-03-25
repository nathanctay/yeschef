-- 1. EXTENSIONS & SCHEMAS
CREATE SCHEMA IF NOT EXISTS "extensions";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";
CREATE EXTENSION IF NOT EXISTS "moddatetime" WITH SCHEMA "extensions";

-- 2. TABLES (In order of dependency)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_follows (
  follower_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('private', 'followers', 'public')),
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'url')),
  source_url text,
  title text NOT NULL,
  description text,
  cover_image_path text,
  content_json jsonb NOT NULL DEFAULT '{}',
  forked_from_recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS recipe_likes (
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS recipe_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cookbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_style text NOT NULL DEFAULT 'color' CHECK (cover_style IN ('color', 'image')),
  cover_color text,
  cover_image_path text,
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'shared')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cookbook_recipes (
  cookbook_id uuid NOT NULL REFERENCES cookbooks(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  PRIMARY KEY (cookbook_id, recipe_id)
);

CREATE TABLE IF NOT EXISTS recipe_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES recipes(id) ON DELETE SET NULL,
  logged_at date NOT NULL,
  notes text,
  rating numeric,
  visibility text NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id);
CREATE INDEX IF NOT EXISTS idx_recipes_created_at ON recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_recipe_likes_recipe_id ON recipe_likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_comments_recipe_id ON recipe_comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_logs_recipe_id ON recipe_logs(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_logs_user_id ON recipe_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_recipe_logs_logged_at ON recipe_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_cookbook_recipes_cookbook_id ON cookbook_recipes(cookbook_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);

-- 4. UPDATED_AT TRIGGERS (Safe Check)
DO $$ 
BEGIN
  -- Profiles
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
  END IF;
  -- Recipes
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'recipes_updated_at') THEN
    CREATE TRIGGER recipes_updated_at BEFORE UPDATE ON recipes FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
  END IF;
  -- Comments
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'recipe_comments_updated_at') THEN
    CREATE TRIGGER recipe_comments_updated_at BEFORE UPDATE ON recipe_comments FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
  END IF;
  -- Cookbooks
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'cookbooks_updated_at') THEN
    CREATE TRIGGER cookbooks_updated_at BEFORE UPDATE ON cookbooks FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
  END IF;
  -- Logs
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'recipe_logs_updated_at') THEN
    CREATE TRIGGER recipe_logs_updated_at BEFORE UPDATE ON recipe_logs FOR EACH ROW EXECUTE PROCEDURE extensions.moddatetime(updated_at);
  END IF;
END $$;

-- 5. AUTH & RLS SETUP
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(new.raw_user_meta_data->>'display_name', new.email));
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Enable RLS on all tables
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- 6. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-covers', 'recipe-covers', true),
       ('cookbook-covers', 'cookbook-covers', true),
       ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;
