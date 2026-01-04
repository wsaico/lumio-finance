import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Montserrat, Outfit, Plus_Jakarta_Sans } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { SettingsEffects } from "@/components/settings/settings-effects";
import { SystemCheck } from "@/components/initialization/system-check";
import { Toaster } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

/* 
// HONOR Sans commented out until files are uploaded to public/fonts/honor-sans/
const honorSans = localFont({
  src: [
    {
      path: "../public/fonts/honor-sans/HONORSans-Thin.ttf",
      weight: "100",
      style: "normal",
    },
    {
      path: "../public/fonts/honor-sans/HONORSans-Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/honor-sans/HONORSans-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/honor-sans/HONORSans-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/honor-sans/HONORSans-Bold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-honor-sans",
});
*/

export const metadata: Metadata = {
  title: "Lumio Finance",
  description: "Professional Financial Suite",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${montserrat.variable} ${outfit.variable} ${plusJakartaSans.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <Providers>
          <SettingsEffects />
          <SystemCheck />
          {children}
          <Toaster
            position="top-right"
            expand={true}
            richColors
            closeButton
            duration={5000}
          />
        </Providers>
      </body>
    </html>
  );
}
