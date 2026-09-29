import { useQuery } from "@tanstack/react-query";
import { api } from "./index";
import { queryKeys } from "./queries";

// Public data hooks. Queries run in the browser only, so server-rendered markup
// shows the loading state and the client fills in the current data.

export const useServices = () =>
  useQuery({ queryKey: queryKeys.services, queryFn: () => api.public.listServices() });

export const usePaymentMethods = () =>
  useQuery({ queryKey: queryKeys.paymentMethods, queryFn: () => api.public.listPaymentMethods() });

export const usePublishedForm = () =>
  useQuery({ queryKey: queryKeys.publishedForm, queryFn: () => api.public.getPublishedForm() });

export const useAvailability = () =>
  useQuery({ queryKey: queryKeys.availability, queryFn: () => api.public.getAvailability() });

export const useSlots = (date?: string) =>
  useQuery({
    queryKey: queryKeys.slots(date ?? ""),
    queryFn: () => api.public.getSlots(date!),
    enabled: Boolean(date),
  });
