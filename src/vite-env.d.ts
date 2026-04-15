/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLASSIFIER_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
