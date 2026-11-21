import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lumio.esaico.com"

    return {
        rules: [
            {
                userAgent: "*",
                allow: ["/", "/login", "/register", "/privacidad", "/terminos"],
                disallow: ["/dashboard/", "/admin/", "/api/"],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}
