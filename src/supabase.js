import { createClient } from '@supabase/supabase-js';

// Project chairo rine Google Client ID ne Secret
const supabaseUrl = 'https://nzkefgwrdndvwulfhrqn.supabase.co';
const supabaseAnonKey = 'sb_publishable_iLqYgBAJbRjZzjp1slbj_Q_rm57wXcF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
