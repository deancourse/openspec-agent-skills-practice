DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'missed_punch_action') THEN
        CREATE TYPE missed_punch_action AS ENUM ('clock_in', 'clock_out');
    END IF;
END $$;

ALTER TABLE attendance_policy
    ADD COLUMN IF NOT EXISTS missed_punch_submission_days INTEGER NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS missed_punch_requires_approval BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS missed_punch_auto_approve_quota INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS missed_punch_allow_admin_override BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS missed_punch_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    approver_user_id UUID REFERENCES users(id),
    reviewer_user_id UUID REFERENCES users(id),
    work_date DATE NOT NULL,
    missing_action missed_punch_action NOT NULL,
    requested_time TIMESTAMPTZ NOT NULL,
    reason TEXT NOT NULL,
    status request_status NOT NULL DEFAULT 'pending',
    review_comment TEXT,
    auto_approved_by_policy BOOLEAN NOT NULL DEFAULT FALSE,
    decided_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_missed_punch_requests_user_work_date
    ON missed_punch_requests(user_id, work_date DESC);

CREATE INDEX IF NOT EXISTS idx_missed_punch_requests_approver_status
    ON missed_punch_requests(approver_user_id, status, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_missed_punch_request
    ON missed_punch_requests(user_id, work_date, missing_action)
    WHERE status = 'pending';
