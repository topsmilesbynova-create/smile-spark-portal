import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/marketing";
export const Route = createFileRoute("/gallery")({ head: () => ({ meta: [{ title: "Gallery — TopSmilesNova" }, { name: "description", content: "Explore TopSmilesNova gallery." }, { property: "og:title", content: "Gallery — TopSmilesNova" }, { property: "og:description", content: "Explore TopSmilesNova gallery." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: () => <ContentPage type="gallery"/> });
