// OnyxZygisk — Vitest setup.
//
// jsdom does not implement window.matchMedia, which the theme composable needs
// to resolve the "system" preference. Stub it so tests can exercise theme logic.
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
