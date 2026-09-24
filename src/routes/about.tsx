import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/marketing";
export const Route = createFileRoute("/about")({ head: () => ({ meta: [{ title: "About — TopSmilesNova" }, { name: "description", content: "Explore TopSmilesNova about." }, { property: "og:title", content: "About — TopSmilesNova" }, { property: "og:description", content: "Explore TopSmilesNova about." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: () => <ContentPage type="about"/> });
