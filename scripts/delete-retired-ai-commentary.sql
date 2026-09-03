-- Phase A: delete cached AI pioneer + AI EGW commentary rows.
-- Identifies commentators by slug dbId and display name — not by guessing UUIDs.
-- Does not touch classic commentator rows (Matthew Henry, JFB, Adam Clarke, John Gill).
-- Run the COUNT first, note the number, then run the DELETE.

SELECT c.id, c.name, count(*)::int AS cached_rows
FROM commentary_entry ce
JOIN commentator c ON c.id = ce.commentator_id
WHERE c.id IN (
    'egw',
    'uriah-smith',
    'jn-andrews',
    'john-loughborough',
    'joseph-bates',
    'james-white'
  )
   OR c.name IN (
    'Ellen G. White',
    'Uriah Smith',
    'J.N. Andrews',
    'John Loughborough',
    'Joseph Bates',
    'James White'
  )
GROUP BY c.id, c.name
ORDER BY c.name;

SELECT count(*)::int AS total_ai_commentary_rows
FROM commentary_entry ce
JOIN commentator c ON c.id = ce.commentator_id
WHERE c.id IN (
    'egw',
    'uriah-smith',
    'jn-andrews',
    'john-loughborough',
    'joseph-bates',
    'james-white'
  )
   OR c.name IN (
    'Ellen G. White',
    'Uriah Smith',
    'J.N. Andrews',
    'John Loughborough',
    'Joseph Bates',
    'James White'
  );

DELETE FROM commentary_entry
WHERE commentator_id IN (
  SELECT id
  FROM commentator
  WHERE id IN (
      'egw',
      'uriah-smith',
      'jn-andrews',
      'john-loughborough',
      'joseph-bates',
      'james-white'
    )
     OR name IN (
      'Ellen G. White',
      'Uriah Smith',
      'J.N. Andrews',
      'John Loughborough',
      'Joseph Bates',
      'James White'
    )
);
