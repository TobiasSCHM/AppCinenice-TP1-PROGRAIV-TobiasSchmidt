import { createClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environment';

// un unico cliente para toda la app (singleton por modulo)
export const supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);
