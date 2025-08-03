-- Safe Resource Distribution System Update
-- Only adds missing components without affecting existing tables
-- Execute these SQL commands in your Supabase SQL Editor

-- 1. Check and create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    tier TEXT DEFAULT 'free', -- 'free', 'premium', 'enterprise'
    api_access BOOLEAN DEFAULT true,
    daily_quota INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Add missing indexes (these are safe to create if they don't exist)
CREATE INDEX IF NOT EXISTS idx_system_usage_date_provider ON system_usage(date, api_provider);
CREATE INDEX IF NOT EXISTS idx_system_usage_updated ON system_usage(updated_at);
CREATE INDEX IF NOT EXISTS idx_user_usage_user_id ON user_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_user_usage_date ON user_usage(date);
CREATE INDEX IF NOT EXISTS idx_user_usage_tier ON user_usage(tier);
CREATE INDEX IF NOT EXISTS idx_request_queue_status_priority ON request_queue(status, priority DESC, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_request_queue_user ON request_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_request_queue_provider ON request_queue(api_provider);
CREATE INDEX IF NOT EXISTS idx_request_queue_type ON request_queue(request_type);
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_provider_type ON api_rate_limits(api_provider, endpoint_type);

-- 3. Enable RLS on all tables (safe to run multiple times)
ALTER TABLE system_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE request_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 4. Add RLS policies (using IF NOT EXISTS where possible)
-- System Usage Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_usage' AND policyname = 'Admins can manage system usage') THEN
        CREATE POLICY "Admins can manage system usage" 
        ON system_usage FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'system_usage' AND policyname = 'Users can read system usage') THEN
        CREATE POLICY "Users can read system usage" 
        ON system_usage FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- User Usage Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_usage' AND policyname = 'Users can see their own usage') THEN
        CREATE POLICY "Users can see their own usage" 
        ON user_usage FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_usage' AND policyname = 'System can insert/update usage') THEN
        CREATE POLICY "System can insert/update usage" 
        ON user_usage FOR ALL 
        USING (true);
    END IF;
END $$;

-- Request Queue Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_queue' AND policyname = 'Users can see their own queue items') THEN
        CREATE POLICY "Users can see their own queue items" 
        ON request_queue FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'request_queue' AND policyname = 'System can manage queue') THEN
        CREATE POLICY "System can manage queue" 
        ON request_queue FOR ALL 
        USING (true);
    END IF;
END $$;

-- API Rate Limits Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limits' AND policyname = 'Admins can manage rate limits') THEN
        CREATE POLICY "Admins can manage rate limits" 
        ON api_rate_limits FOR ALL 
        USING (auth.jwt() ->> 'role' = 'admin');
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'api_rate_limits' AND policyname = 'Users can read rate limits') THEN
        CREATE POLICY "Users can read rate limits" 
        ON api_rate_limits FOR SELECT 
        USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- Profiles Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can see their own profile') THEN
        CREATE POLICY "Users can see their own profile" 
        ON profiles FOR SELECT 
        USING (auth.uid() = id);
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" 
        ON profiles FOR UPDATE 
        USING (auth.uid() = id);
    END IF;
END $$;

-- 5. Database Functions (safe to create or replace)
CREATE OR REPLACE FUNCTION increment_user_usage(
  p_user_id UUID,
  p_api_provider TEXT,
  p_request_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO user_usage (user_id, api_provider)
  VALUES (p_user_id, p_api_provider)
  ON CONFLICT (user_id, date, api_provider) 
  DO UPDATE SET
    search_requests = CASE WHEN p_request_type = 'search' THEN user_usage.search_requests + 1 ELSE user_usage.search_requests END,
    booking_requests = CASE WHEN p_request_type = 'booking' THEN user_usage.booking_requests + 1 ELSE user_usage.booking_requests END,
    availability_requests = CASE WHEN p_request_type = 'availability' THEN user_usage.availability_requests + 1 ELSE user_usage.availability_requests END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_system_usage(
  p_api_provider TEXT,
  p_request_type TEXT
) RETURNS VOID AS $$
BEGIN
  INSERT INTO system_usage (api_provider)
  VALUES (p_api_provider)
  ON CONFLICT (date, api_provider) 
  DO UPDATE SET
    search_requests = CASE WHEN p_request_type = 'search' THEN system_usage.search_requests + 1 ELSE system_usage.search_requests END,
    booking_requests = CASE WHEN p_request_type = 'booking' THEN system_usage.booking_requests + 1 ELSE system_usage.booking_requests END,
    availability_requests = CASE WHEN p_request_type = 'availability' THEN system_usage.availability_requests + 1 ELSE system_usage.availability_requests END,
    hourly_usage = CASE WHEN EXTRACT(HOUR FROM NOW()) = current_hour THEN hourly_usage + 1 ELSE 1 END,
    current_hour = EXTRACT(HOUR FROM NOW()),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_queue_position(p_queue_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
  position INTEGER;
BEGIN
  SELECT COUNT(*) + 1 INTO position
  FROM request_queue 
  WHERE status = 'pending' 
  AND (priority > (SELECT priority FROM request_queue WHERE id = p_queue_id)
       OR (priority = (SELECT priority FROM request_queue WHERE id = p_queue_id) 
           AND scheduled_at < (SELECT scheduled_at FROM request_queue WHERE id = p_queue_id)));
  
  RETURN position;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION cleanup_old_queue_items()
RETURNS VOID AS $$
BEGIN
  DELETE FROM request_queue 
  WHERE status IN ('completed', 'failed') 
  AND completed_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION reset_daily_usage()
RETURNS VOID AS $$
BEGIN
  DELETE FROM user_usage WHERE date < CURRENT_DATE;
  DELETE FROM system_usage WHERE date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic cleanup
CREATE OR REPLACE FUNCTION trigger_cleanup_old_data()
RETURNS TRIGGER AS $$
BEGIN
  -- Clean up old data periodically
  IF random() < 0.01 THEN -- 1% chance to trigger cleanup
    PERFORM cleanup_old_queue_items();
    PERFORM reset_daily_usage();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS cleanup_trigger ON request_queue;
CREATE TRIGGER cleanup_trigger
AFTER INSERT ON request_queue
FOR EACH ROW
EXECUTE FUNCTION trigger_cleanup_old_data();

-- 6. Insert default API rate limits if they don't exist
INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('hotelbeds', 'search', 10, 600, 3600, 86400)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('hotelbeds', 'booking', 5, 300, 1800, 43200)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('hotelbeds', 'availability', 8, 480, 2880, 69120)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('amadeus', 'search', 5, 300, 1800, 43200)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('amadeus', 'booking', 3, 180, 1080, 25920)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('expedia', 'search', 12, 720, 4320, 103680)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

INSERT INTO api_rate_limits (api_provider, endpoint_type, requests_per_second, requests_per_minute, requests_per_hour, requests_per_day) 
VALUES ('expedia', 'booking', 6, 360, 2160, 51840)
ON CONFLICT (api_provider, endpoint_type) DO NOTHING;

-- Success message
SELECT 'Smart Resource Distribution System setup completed successfully!' as message;
