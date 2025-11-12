/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_WS_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_AMAP_KEY: string
  readonly VITE_XUNFEI_APP_ID: string
  readonly VITE_XUNFEI_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

