import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SettingsEffects } from "@/components/settings/settings-effects";
import { SystemCheck } from "@/components/initialization/system-check";
import { PWAProvider } from "@/components/pwa/pwa-provider";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://lumio.esaico.com"),
  title: {
    default: "Lumio Finance — Control de Finanzas Personales, Presupuestos y Metas",
    template: "%s | Lumio Finance",
  },
  description:
    "Controla tus cuentas, tarjetas de crédito, presupuestos, préstamos y metas de ahorro con total claridad. Empieza con 15 días gratis y conserva tu Plan Básico de por vida.",
  keywords: [
    "finanzas personales",
    "control de gastos",
    "presupuesto mensual",
    "tarjetas de crédito",
    "metas de ahorro",
    "préstamos personales",
    "app finanzas Perú",
  ],
  authors: [{ name: "Wilber Saico", url: "https://esaico.com" }],
  creator: "Wilber Saico",
  applicationName: "Lumio Finance",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Lumio",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#7C5CFC" },
    { media: "(prefers-color-scheme: dark)", color: "#121318" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className="font-sans antialiased bg-background text-foreground selection:bg-primary/20 selection:text-primary"
        suppressHydrationWarning={true}
      >
        <Providers>
          <PWAProvider>
            <SettingsEffects />
            <SystemCheck />
            {children}
            <Toaster
              position="top-right"
              expand={false}
              duration={4500}
              toastOptions={{
                className:
                  "rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl text-foreground font-sans p-3.5 shadow-2xl text-xs font-medium gap-3",
                classNames: {
                  toast:
                    "rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl text-foreground font-sans p-3.5 shadow-2xl dark:bg-[#14151C]/95",
                  title: "text-xs font-bold text-foreground tracking-tight",
                  description: "text-[11px] text-muted-foreground leading-normal",
                  actionButton:
                    "rounded-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs px-3.5 py-1.5 shadow-md shadow-primary/25 transition-transform active:scale-95 cursor-pointer",
                  cancelButton:
                    "rounded-full bg-muted hover:bg-muted/80 text-muted-foreground text-xs px-3 py-1.5 cursor-pointer",
                  closeButton:
                    "border border-border/60 bg-background/90 text-muted-foreground hover:text-foreground rounded-full shadow-sm cursor-pointer",
                },
              }}
            />
          </PWAProvider>
        </Providers>
      </body>
    </html>
  );
}
