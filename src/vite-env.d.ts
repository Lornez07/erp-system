/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Supabase project URL (Dashboard → Project Settings → API) */
  readonly VITE_SUPABASE_URL?: string;
  /** Supabase anon (public) key — safe for the browser when RLS is enforced */
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
