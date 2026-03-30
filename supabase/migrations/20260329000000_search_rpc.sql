-- search_recipes: ILIKE search on title + description, title matches ranked first
-- viewer_id = null means unauthenticated — only public recipes returned
-- (NULL = owner_id evaluates to NULL/false, so private recipes are filtered out)
CREATE OR REPLACE FUNCTION search_recipes(
  query     text,
  viewer_id uuid,
  lim       int,
  off       int
)
RETURNS TABLE (
  id                  uuid,
  owner_id            uuid,
  title               text,
  description         text,
  cover_image_path    text,
  visibility          text,
  rating_avg          float,
  rating_count        int,
  created_at          timestamptz,
  owner_display_name  text,
  owner_avatar_url    text
)
LANGUAGE sql STABLE AS $$
  SELECT
    r.id,
    r.owner_id,
    r.title,
    r.description,
    r.cover_image_path,
    r.visibility,
    r.rating_avg,
    r.rating_count,
    r.created_at,
    p.display_name AS owner_display_name,
    p.avatar_url   AS owner_avatar_url
  FROM recipes r
  JOIN profiles p ON p.id = r.owner_id
  WHERE
    (r.title ILIKE '%' || query || '%' OR r.description ILIKE '%' || query || '%')
    AND (r.visibility = 'public' OR r.owner_id = viewer_id)
  ORDER BY
    CASE WHEN r.title ILIKE '%' || query || '%' THEN 0 ELSE 1 END,
    r.rating_avg DESC NULLS LAST
  LIMIT lim OFFSET off;
$$;

GRANT EXECUTE ON FUNCTION search_recipes(text, uuid, int, int) TO anon, authenticated;
