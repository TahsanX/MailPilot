-- Supports serverless (Vercel) deployment: summarization and the Make.com "onboarded" notification
-- can no longer run as fire-and-forget work after the signup response, since a serverless function
-- is frozen right after it responds. They are now done by a cron job instead (POST/GET
-- /api/cron/process-pending), which needs two things the old synchronous flow did not: the PDF
-- bytes to still be around on a later, separate invocation, and a flag so a user is notified once.

begin;

-- Holds the PDF bytes only until the cron job summarizes them (or gives up), then this is cleared.
-- The original "the file itself is not stored" guarantee still holds once summary_status leaves
-- 'pending'/'processing': this is transient queue storage, not a permanent copy.
alter table detail_files add column if not exists file_data bytea;

-- Set once notifyMake("user.onboarded", ...) has been sent for this user, so the cron job's next
-- tick does not notify Make again for the same signup.
alter table users add column if not exists onboarding_notified_at timestamptz;

commit;
