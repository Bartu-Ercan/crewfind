import type { MetadataRoute } from "next";
import { siteUrl } from "@/frontend/config/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: new URL("/valorant", siteUrl).toString(),
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];
}
