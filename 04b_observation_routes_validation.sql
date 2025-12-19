-- Counts: observations vs links
SELECT
  (SELECT COUNT(*) FROM observations) AS observations_count,
  (SELECT COUNT(*) FROM observation_routes) AS linked_count;

-- Unmatched observations
SELECT COUNT(*) AS unmatched_count
FROM observations o
LEFT JOIN observation_routes r ON r.observation_id = o.id
WHERE r.observation_id IS NULL;
