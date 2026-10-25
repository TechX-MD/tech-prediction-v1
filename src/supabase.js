import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nzkefgwrdndvwulfhrqn.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_iLqYgBAJbRjZzjp1slbj_Q_rm57wXcF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
