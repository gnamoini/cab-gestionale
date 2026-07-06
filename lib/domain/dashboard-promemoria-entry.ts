"use client";

import { withPageWriteGuard } from "@/lib/domain/with-page-write-guard";
import { dashboardPromemoriaService } from "@/src/services/dashboard-promemoria.service";

export const dashboardPromemoriaEntry = {
  listByMonth: dashboardPromemoriaService.listByMonth.bind(dashboardPromemoriaService),
  listByDate: dashboardPromemoriaService.listByDate.bind(dashboardPromemoriaService),
  listDueTodayForReminder: dashboardPromemoriaService.listDueTodayForReminder.bind(dashboardPromemoriaService),
  create: withPageWriteGuard("dashboard", dashboardPromemoriaService.create.bind(dashboardPromemoriaService)),
  update: withPageWriteGuard("dashboard", dashboardPromemoriaService.update.bind(dashboardPromemoriaService)),
  softDelete: withPageWriteGuard("dashboard", dashboardPromemoriaService.softDelete.bind(dashboardPromemoriaService)),
  markNotified: withPageWriteGuard("dashboard", dashboardPromemoriaService.markNotified.bind(dashboardPromemoriaService)),
};
