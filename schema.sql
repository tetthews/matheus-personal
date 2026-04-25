-- =====================================================
-- matheus-personal — Schema SQL para Supabase
-- Cole no SQL Editor do Supabase e execute
-- =====================================================

-- daily_logs: blocos do dia (academia, caminhadas, sesta, água)
CREATE TABLE IF NOT EXISTS daily_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  block_id    TEXT NOT NULL CHECK (block_id IN ('academia','camm','camt','sesta','agua')),
  done        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, block_id)
);

-- meal_logs: refeições do dia
CREATE TABLE IF NOT EXISTS meal_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  meal_id     TEXT NOT NULL CHECK (meal_id IN ('cafe','almoco','tarde','janta','ceia')),
  done        BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, meal_id)
);

-- exercise_logs: exercícios do treino
CREATE TABLE IF NOT EXISTS exercise_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  exercise_index  INTEGER NOT NULL,
  done            BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, date, exercise_index)
);

-- weight_logs: histórico de peso
CREATE TABLE IF NOT EXISTS weight_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  weight      NUMERIC(5,2) NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- user_xp: XP acumulado por usuário
CREATE TABLE IF NOT EXISTS user_xp (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_xp    INTEGER NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- Row Level Security
-- =====================================================

ALTER TABLE daily_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs     ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE weight_logs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_xp       ENABLE ROW LEVEL SECURITY;

-- daily_logs
CREATE POLICY "daily_logs_select" ON daily_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "daily_logs_insert" ON daily_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "daily_logs_update" ON daily_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "daily_logs_delete" ON daily_logs FOR DELETE USING (user_id = auth.uid());

-- meal_logs
CREATE POLICY "meal_logs_select" ON meal_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "meal_logs_insert" ON meal_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "meal_logs_update" ON meal_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "meal_logs_delete" ON meal_logs FOR DELETE USING (user_id = auth.uid());

-- exercise_logs
CREATE POLICY "exercise_logs_select" ON exercise_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "exercise_logs_insert" ON exercise_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "exercise_logs_update" ON exercise_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "exercise_logs_delete" ON exercise_logs FOR DELETE USING (user_id = auth.uid());

-- weight_logs
CREATE POLICY "weight_logs_select" ON weight_logs FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "weight_logs_insert" ON weight_logs FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "weight_logs_update" ON weight_logs FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "weight_logs_delete" ON weight_logs FOR DELETE USING (user_id = auth.uid());

-- user_xp
CREATE POLICY "user_xp_select" ON user_xp FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_xp_insert" ON user_xp FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_xp_update" ON user_xp FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_xp_delete" ON user_xp FOR DELETE USING (user_id = auth.uid());
