// Per-browser admin notification preferences. A convenience only: the backend will
// own real delivery preferences per staff account.
import { useCallback, useEffect, useState } from "react";
import type { NotificationType } from "@/lib/api/contracts";
import { readStored, writeStored } from "@/lib/storage";

export type NotificationPrefs = Record<NotificationType, boolean>;

export const notificationPrefLabels: Record<NotificationType, string> = {
  visitor_arrived: "Visitor arrivals",
  booking_created: "New bookings",
  proof_submitted: "Payment proof",
  proof_rejected: "Rejected proof",
  payment_verified: "Confirmed payments",
};

const KEY = "notification-prefs";
const EVENT = "tsn:notification-prefs";
const defaults: NotificationPrefs = {
  visitor_arrived: true,
  booking_created: true,
  proof_submitted: true,
  proof_rejected: true,
  payment_verified: true,
};

export function useNotificationPrefs() {
  const [prefs, setPrefs] = useState<NotificationPrefs>(defaults);
  useEffect(() => {
    const sync = () =>
      setPrefs({ ...defaults, ...readStored<Partial<NotificationPrefs>>(KEY, {}) });
    sync();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, []);
  const setPref = useCallback((type: NotificationType, value: boolean) => {
    const next = { ...defaults, ...readStored<Partial<NotificationPrefs>>(KEY, {}), [type]: value };
    writeStored(KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [prefs, setPref] as const;
}
