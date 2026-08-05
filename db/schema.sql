CREATE TABLE IF NOT EXISTS bom_dia (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  soundtrack_title TEXT NOT NULL,
  soundtrack_artist TEXT NOT NULL,
  recipe_title TEXT NOT NULL,
  recipe_description TEXT NOT NULL,
  quick_tip TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  snippet TEXT NOT NULL,
  read_time TEXT DEFAULT '5 min',
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  event_date TEXT NOT NULL,
  location TEXT NOT NULL,
  image_url TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
