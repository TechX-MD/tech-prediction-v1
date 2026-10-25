import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pyogzhrsfugnnxvclhea.supabase.co';
const supabaseAnonKey = 'sb_publishable_iLqYgBAJbRjZzjp1slbj_Q_rm57wXcF';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
