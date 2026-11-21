import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lumio Finance — Finanzas Personales",
    short_name: "Lumio",
    description:
      "Controla tus finanzas personales con claridad, inteligencia y elegancia.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F4F6FB",
    theme_color: "#7C5CFC",
    categories: ["finance", "productivity", "utilities"],
    lang: "es",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Nuevo Gasto",
        short_name: "Gasto",
        description: "Registrar un gasto rápidamente",
        url: "/dashboard/transactions/new?type=EXPENSE",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Nuevo Ingreso",
        short_name: "Ingreso",
        description: "Registrar un ingreso rápidamente",
        url: "/dashboard/transactions/new?type=INCOME",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
      {
        name: "Movimientos",
        short_name: "Movimientos",
        description: "Ver tus transacciones recientes",
        url: "/dashboard/transactions",
        icons: [{ src: "/icons/icon-192x192.png", sizes: "192x192" }],
      },
    ],
  };
}
