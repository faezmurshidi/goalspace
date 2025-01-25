-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  space_id UUID REFERENCES spaces(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE modules ENABLE ROW LEVEL SECURITY;

-- Create policies for modules table
CREATE POLICY "Users can view own modules" ON modules
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own modules" ON modules
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own modules" ON modules
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own modules" ON modules
  FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_modules_updated_at
  BEFORE UPDATE ON modules
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column(); 