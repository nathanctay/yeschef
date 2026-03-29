-- Recipe image gallery
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS images jsonb NOT NULL DEFAULT '[]';

-- Rating cache (running average)
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rating_avg float;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS rating_count int NOT NULL DEFAULT 0;

-- Backfill rating_avg and rating_count from existing logs
UPDATE recipes r
SET
  rating_count = sub.cnt,
  rating_avg   = sub.avg
FROM (
  SELECT recipe_id, COUNT(*) AS cnt, AVG(rating) AS avg
  FROM recipe_logs
  WHERE rating IS NOT NULL
  GROUP BY recipe_id
) sub
WHERE r.id = sub.recipe_id;

-- Recipe metadata
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS servings int;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS prep_time_minutes int;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS cook_time_minutes int;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS total_time_minutes int;
ALTER TABLE recipes ADD COLUMN IF NOT EXISTS nutrition_json jsonb;
