-- Profiles & Social
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT
);

CREATE TABLE user_follows (
  follower_id UUID REFERENCES profiles(id),
  following_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP,
  PRIMARY KEY (follower_id, following_id)
);

-- Recipes
CREATE TABLE recipes (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  visibility TEXT,
  source_type TEXT,
  source_url TEXT,
  title TEXT,
  description TEXT,
  cover_image_path TEXT,
  content_json JSON,
  forked_from_recipe_id UUID REFERENCES recipes(id),
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Interactions
CREATE TABLE recipe_likes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  recipe_id UUID REFERENCES recipes(id),
  created_at TIMESTAMP
);

CREATE TABLE recipe_comments (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  recipe_id UUID REFERENCES recipes(id),
  body TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- Cookbooks
CREATE TABLE cookbooks (
  id UUID PRIMARY KEY,
  owner_id UUID REFERENCES profiles(id),
  name TEXT,
  description TEXT,
  cover_style TEXT,
  cover_color TEXT,
  cover_image_path TEXT,
  visibility TEXT,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

CREATE TABLE cookbook_members (
  cookbook_id UUID REFERENCES cookbooks(id),
  user_id UUID REFERENCES profiles(id),
  role TEXT,
  PRIMARY KEY (cookbook_id, user_id)
);

CREATE TABLE cookbook_recipes (
  cookbook_id UUID REFERENCES cookbooks(id),
  recipe_id UUID REFERENCES recipes(id),
  sort_order INT,
  PRIMARY KEY (cookbook_id, recipe_id)
);