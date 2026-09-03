import type { MetadataRoute } from "next";
import { siteUrl } from "@/frontend/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/valorant", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/league-of-legends", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/cs2", siteUrl).toString(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/gizlilik", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: new URL("/kullanim-kosullari", siteUrl).toString(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];
}
