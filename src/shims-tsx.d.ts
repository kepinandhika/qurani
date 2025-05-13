import 'vue';

declare module 'vue' {
  interface HTMLAttributes {
    /**
     * Text direction for bidirectional text support.
     * e.g. <span dir="rtl">…</span>
     */
    dir?: string;
  }
}
