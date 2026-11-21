import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://lumio.esaico.com"
    const now = new Date()

    return [
        { url: baseUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
        { url: `${baseUrl}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
        { url: `${baseUrl}/register`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
        { url: `${baseUrl}/privacidad`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
        { url: `${baseUrl}/terminos`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
    ]
}
