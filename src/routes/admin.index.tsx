import { createFileRoute } from "@tanstack/react-router";
import { Overview } from "@/components/admin-dashboard";
export const Route = createFileRoute("/admin/")({ component: Overview });
