import { createClient } from "@supabase/supabase-js";

// Anon client — safe for client components, read-only by RLS convention.
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);