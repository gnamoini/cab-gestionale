import {
  NOTIFICATION_EVENT_CATALOG,
  type NotificationEventDefinition,
} from "@/lib/notifications/notification-event-catalog";
import {
  buildEventPreferenceOverrideMap,
  isNotificationEventEnabled,
} from "@/lib/notifications/preferences/notification-preference-resolver";
import type {
  NotificationSettingsEventViewModel,
  NotificationSettingsPageViewModel,
  NotificationSettingsViewModel,
} from "@/lib/notifications/preferences/notification-preferences-api";
import { GESTIONALE_PAGES, type GestionalePageKey } from "@/src/lib/permissions/gestionale-pages";
import { canReadPage, canWritePage, type ResolvedPageAccess } from "@/src/lib/rbac/resolve-page-access";
import type { NotificationEventPreferenceRow } from "@/lib/notifications/preferences/load-event-preferences.server";

function pageHasRequiredAccess(
  resolved: ResolvedPageAccess,
  pageKey: GestionalePageKey,
  requiredAccess: NotificationEventDefinition["requiredAccess"],
): boolean {
  if (requiredAccess === "write") return canWritePage(resolved, pageKey);
  return canReadPage(resolved, pageKey) || canWritePage(resolved, pageKey);
}

function isEventVisibleToUser(entry: NotificationEventDefinition, resolved: ResolvedPageAccess): boolean {
  if (!entry.userConfigurable || entry.notificationMode === "mandatory") return false;
  return pageHasRequiredAccess(resolved, entry.pageKey, entry.requiredAccess);
}

function toEventViewModel(
  entry: NotificationEventDefinition,
  userId: string,
  companyId: string,
  overrides: ReturnType<typeof buildEventPreferenceOverrideMap>,
): NotificationSettingsEventViewModel {
  const override = overrides.get(`${userId}:${companyId}:${entry.notificationEventId}`);
  const isOverridden = override !== undefined;
  const enabled = isNotificationEventEnabled({
    notificationEventId: entry.notificationEventId,
    userId,
    companyId,
    entry,
    overrides,
  });
  return {
    notificationEventId: entry.notificationEventId,
    title: entry.titleTemplate,
    description: entry.description,
    enabled,
    preferenceSource: isOverridden ? "personalized" : "default",
    severity: entry.severity,
    canRestore: isOverridden,
  };
}

export function buildNotificationSettingsViewModel(input: {
  resolved: ResolvedPageAccess;
  companyId: string;
  preferenceRows: NotificationEventPreferenceRow[];
  searchQuery?: string;
}): NotificationSettingsViewModel {
  const { resolved, companyId, preferenceRows, searchQuery } = input;
  const overrides = buildEventPreferenceOverrideMap(preferenceRows);
  const q = searchQuery?.trim().toLowerCase() ?? "";

  const pageLabelByKey = new Map<string, string>(GESTIONALE_PAGES.map((p) => [p.key, p.label]));
  const pageOrderByKey = new Map<string, number>(GESTIONALE_PAGES.map((p) => [p.key, p.order]));
  const pagesMap = new Map<GestionalePageKey, NotificationSettingsPageViewModel>();

  for (const entry of NOTIFICATION_EVENT_CATALOG) {
    if (!isEventVisibleToUser(entry, resolved)) continue;

    const pageLabel = pageLabelByKey.get(entry.pageKey) ?? entry.pageKey;
    const eventVm = toEventViewModel(entry, resolved.userId, companyId, overrides);

    if (q) {
      const haystack = `${pageLabel} ${eventVm.title} ${eventVm.description}`.toLowerCase();
      if (!haystack.includes(q)) continue;
    }

    let page = pagesMap.get(entry.pageKey);
    if (!page) {
      page = {
        key: entry.pageKey,
        label: pageLabel,
        enabledCount: 0,
        totalCount: 0,
        events: [],
      };
      pagesMap.set(entry.pageKey, page);
    }
    page.events.push(eventVm);
    page.totalCount += 1;
    if (eventVm.enabled) page.enabledCount += 1;
  }

  const pages = [...pagesMap.values()]
    .filter((p) => p.events.length > 0)
    .sort((a, b) => {
      const orderA = pageOrderByKey.get(a.key) ?? Number.MAX_SAFE_INTEGER;
      const orderB = pageOrderByKey.get(b.key) ?? Number.MAX_SAFE_INTEGER;
      if (orderA !== orderB) return orderA - orderB;
      return a.label.localeCompare(b.label, "it");
    });

  return {
    pages,
    channelPreferences: { inbox: true, push: true, email: false },
  };
}

export function filterSettingsViewModelBySearch(
  vm: NotificationSettingsViewModel,
  searchQuery: string,
): NotificationSettingsViewModel {
  const q = searchQuery.trim().toLowerCase();
  if (!q) return vm;
  return {
    ...vm,
    pages: vm.pages
      .map((page) => ({
        ...page,
        events: page.events.filter((e) => {
          const haystack = `${page.label} ${e.title} ${e.description}`.toLowerCase();
          return haystack.includes(q);
        }),
      }))
      .filter((p) => p.events.length > 0)
      .map((page) => ({
        ...page,
        totalCount: page.events.length,
        enabledCount: page.events.filter((e) => e.enabled).length,
      })),
  };
}
