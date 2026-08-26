-- Create competitions table
CREATE TABLE IF NOT EXISTS public.competitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    prize_image_url TEXT,
    story_image_url TEXT,
    instagram_account_url TEXT,
    instagram_post_url TEXT,
    end_date TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create competition_participants table
CREATE TABLE IF NOT EXISTS public.competition_participants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competition_id UUID REFERENCES public.competitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    instagram_username TEXT NOT NULL,
    is_winner BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(competition_id, user_id) -- A user can only participate once per competition
);

-- Enable RLS
ALTER TABLE public.competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competition_participants ENABLE ROW LEVEL SECURITY;

-- Policies for competitions
CREATE POLICY "Competitions are viewable by everyone" 
ON public.competitions FOR SELECT 
USING (true);

CREATE POLICY "Admins can insert competitions" 
ON public.competitions FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can update competitions" 
ON public.competitions FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

CREATE POLICY "Admins can delete competitions" 
ON public.competitions FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Policies for competition_participants
-- Users can insert their own participation
CREATE POLICY "Users can insert their own participation" 
ON public.competition_participants FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can read their own participations
CREATE POLICY "Users can view their own participations" 
ON public.competition_participants FOR SELECT 
USING (auth.uid() = user_id);

-- Admins can read all participations
CREATE POLICY "Admins can view all participations" 
ON public.competition_participants FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Admins can update participations (e.g., to set is_winner)
CREATE POLICY "Admins can update participations" 
ON public.competition_participants FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Admins can delete participations
CREATE POLICY "Admins can delete participations" 
ON public.competition_participants FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);
