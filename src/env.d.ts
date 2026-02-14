/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLISHER_SECRET?: string;
  readonly PUBLISHER_PRIVATE_KEY?: string;
  readonly PUBLISHER_PUBLIC_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
