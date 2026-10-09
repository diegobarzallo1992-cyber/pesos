import { createClient } from "@supabase/supabase-js";

// La clave publicable esta pensada para ir en la app; la seguridad la dan las politicas RLS (supabase/schema.sql).
export const URL_SB = import.meta.env.VITE_SUPABASE_URL ?? "https://wqrtmkxtrzblghviumsd.supabase.co";
export const KEY_SB = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "sb_publishable_BDMsagmmNKYv_MDsPJ1U_Q_2iMasBBJ";

export const supabase = createClient(URL_SB, KEY_SB, { auth: { persistSession: true, autoRefreshToken: true } });
