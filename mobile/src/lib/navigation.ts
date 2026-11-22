export function safeGoBack(
  router: {
    canGoBack: () => boolean;
    back: () => void;
    replace: (href: any) => void;
  },
  fallback = '/(tabs)'
) {
  try {
    if (typeof router.canGoBack === 'function' && router.canGoBack()) {
      router.back();
      return;
    }
  } catch {
    // fall through to replace
  }
  router.replace(fallback as any);
}
