"use client";

import dynamic from "next/dynamic";
import { LoadingCardSkeleton } from "@/components/design-system";

function tabLoading() {
  return <LoadingCardSkeleton minHeightClass="min-h-[280px]" rows={4} />;
}

export const SecurityRolesPanelLazy = dynamic(
  () =>
    import("@/components/dashboard/security/security-roles-panel").then((m) => ({
      default: m.SecurityRolesPanel,
    })),
  { loading: tabLoading },
);

export const SecurityMonitoringSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/security/security-monitoring-section").then((m) => ({
      default: m.SecurityMonitoringSection,
    })),
  { loading: tabLoading },
);

export const SecurityReleaseSectionLazy = dynamic(
  () =>
    import("@/components/dashboard/security/security-release-section").then((m) => ({
      default: m.SecurityReleaseSection,
    })),
  { loading: tabLoading },
);

export const SecurityCreateUserModalLazy = dynamic(() =>
  import("@/components/dashboard/security-create-user-modal").then((m) => ({
    default: m.SecurityCreateUserModal,
  })),
);

export const SecurityUserDetailDrawerLazy = dynamic(() =>
  import("@/components/dashboard/security/security-user-detail-drawer").then((m) => ({
    default: m.SecurityUserDetailDrawer,
  })),
);

export const SecurityEditNameModalLazy = dynamic(() =>
  import("@/components/dashboard/security/security-edit-name-modal").then((m) => ({
    default: m.SecurityEditNameModal,
  })),
);

export const SecurityRoleCreateModalLazy = dynamic(() =>
  import("@/components/dashboard/security/security-role-create-modal").then((m) => ({
    default: m.SecurityRoleCreateModal,
  })),
);

export const SecurityUsersPermissionsPanelLazy = dynamic(
  () =>
    import("@/components/dashboard/security/security-users-permissions-panel").then((m) => ({
      default: m.SecurityUsersPermissionsPanel,
    })),
  { loading: tabLoading },
);
