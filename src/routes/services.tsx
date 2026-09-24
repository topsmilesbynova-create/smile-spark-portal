import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/marketing";
export const Route = createFileRoute("/services")({ head: () => ({ meta: [{ title: "Services — TopSmilesNova" }, { name: "description", content: "Explore TopSmilesNova services." }, { property: "og:title", content: "Services — TopSmilesNova" }, { property: "og:description", content: "Explore TopSmilesNova services." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: () => <ContentPage type="services"/> });
