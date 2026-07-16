const ADMIN_EMAILS = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "")
  .split(",")
  .map(e => e.trim().toLowerCase())
  .filter(Boolean);

const isAdminEmail = (email: string | null | undefined) =>
  !!email && ADMIN_EMAILS.includes(email.toLowerCase());

export const isAdmin = (email: string | null | undefined, profileIsAdmin?: boolean) =>
  isAdminEmail(email) || !!profileIsAdmin;
