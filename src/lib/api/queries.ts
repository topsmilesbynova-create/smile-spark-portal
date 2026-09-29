// React Query keys shared by screens, so a change in one screen refreshes the others.
export const queryKeys = {
  services: ["services"] as const,
  paymentMethods: ["payment-methods"] as const,
  availability: ["availability"] as const,
  slots: (date: string) => ["slots", date] as const,
  publishedForm: ["form", "published"] as const,
  formDraft: ["form", "draft"] as const,
  formVersion: (version: number) => ["form", "version", version] as const,
  bookingStatus: (reference: string) => ["booking-status", reference.toLowerCase()] as const,
  admin: {
    all: ["admin"] as const,
    bookings: ["admin", "bookings"] as const,
    services: ["admin", "services"] as const,
    paymentMethods: ["admin", "payment-methods"] as const,
    notifications: ["admin", "notifications"] as const,
  },
};

/** Message for a failed API call, suitable for a toast. */
export const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
