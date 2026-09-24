import { createFileRoute } from "@tanstack/react-router";
import { ContentPage } from "@/components/marketing";
export const Route = createFileRoute("/contact")({ head: () => ({ meta: [{ title: "Contact — TopSmilesNova" }, { name: "description", content: "Explore TopSmilesNova contact." }, { property: "og:title", content: "Contact — TopSmilesNova" }, { property: "og:description", content: "Explore TopSmilesNova contact." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }), component: () => <ContentPage type="contact"/> });
