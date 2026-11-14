/** Role vocabulary shared by server and client code (no server-only imports here). */
export type EventRole = "owner" | "admin" | "scanner" | "viewer";

export const ROLE_LABELS: Record<EventRole, string> = {
  owner: "Owner",
  admin: "Admin",
  scanner: "Scanner",
  viewer: "Viewer",
};

export type OrgRole = "owner" | "admin" | "member";

export const ORG_ROLE_LABELS: Record<OrgRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const ORG_ROLE_HELP: Record<OrgRole, string> = {
  owner: "Everything, including deleting the organization.",
  admin: "Manages every event, the organization and its members.",
  member: "Works on every event. Can't change organization settings or members.",
};

export const ADMIN_ROLES: EventRole[] = ["owner", "admin"];
export const CHECKIN_ROLES: EventRole[] = ["owner", "admin", "scanner"];
export const TASK_READ_ROLES: EventRole[] = ["owner", "admin", "viewer"];
