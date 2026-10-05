/** Role vocabulary shared by server and client code (no server-only imports here). */
export type EventRole = "owner" | "admin" | "scanner" | "viewer";

export const ROLE_LABELS: Record<EventRole, string> = {
  owner: "Owner",
  admin: "Admin",
  scanner: "Scanner",
  viewer: "Viewer",
};

export const ADMIN_ROLES: EventRole[] = ["owner", "admin"];
export const CHECKIN_ROLES: EventRole[] = ["owner", "admin", "scanner"];
export const TASK_READ_ROLES: EventRole[] = ["owner", "admin", "viewer"];
