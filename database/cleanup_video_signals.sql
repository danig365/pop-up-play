-- Cleanup old video signals to prevent stale call notifications
-- Run this before testing video calls

-- Delete all video signals (clean slate for testing)
DELETE FROM "VideoSignal";

-- Optional: Delete signals older than 5 minutes (for production use)
-- DELETE FROM "VideoSignal" WHERE created_date < NOW() - INTERVAL '5 minutes';

-- Show remaining signals
SELECT * FROM "VideoSignal";
