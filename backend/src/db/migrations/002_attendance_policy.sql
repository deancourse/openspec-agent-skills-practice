CREATE TABLE IF NOT EXISTS attendance_policy (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE,
    work_start_time TIME NOT NULL DEFAULT '09:00',
    work_end_time TIME NOT NULL DEFAULT '18:00',
    grace_minutes INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO attendance_policy (id, work_start_time, work_end_time, grace_minutes)
VALUES (TRUE, '09:00', '18:00', 0)
ON CONFLICT (id) DO NOTHING;
