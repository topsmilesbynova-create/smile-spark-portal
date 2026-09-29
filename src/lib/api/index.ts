import type { TopSmilesApi } from "./client";
import { API_MODE } from "./config";
import { httpApi } from "./http";
import { mockApi } from "./mock";

/** The single entry point UI code uses for data. Set VITE_API_BASE_URL to use the NestJS API. */
export const api: TopSmilesApi = API_MODE === "http" ? httpApi : mockApi;

export { API_MODE } from "./config";
export { ApiError } from "./http";
export * from "./contracts";
export type { AdminApi, PublicApi, TopSmilesApi } from "./client";
