"use client";

import { AdminDipendentiPresenzeReminderBridge } from "@/src/components/admin-dipendenti-presenze-reminder-bridge";
import { AdminLavorazioniNotificationBridge } from "@/src/components/admin-lavorazioni-notification-bridge";
import { AdminMagazzinoNotificationBridge } from "@/src/components/admin-magazzino-notification-bridge";

export default function AdminNotificationBridgePack() {
  return (
    <>
      <AdminLavorazioniNotificationBridge />
      <AdminMagazzinoNotificationBridge />
      <AdminDipendentiPresenzeReminderBridge />
    </>
  );
}
