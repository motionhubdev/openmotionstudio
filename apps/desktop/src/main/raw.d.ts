declare module '*.md?raw' {
  const text: string;
  export default text;
}

declare module '*.txt?raw' {
  const text: string;
  export default text;
}

/** What the build sets (electron.vite.config.mts): whether a dev build's control server is bundled (ADR 0023). */
interface ImportMeta {
  readonly env: { readonly OMS_DEV_CONTROL: boolean };
}
