export const REMEMBER_EMAIL_KEY = "nzo-login-email";

export function readRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function hasRememberedEmail(): boolean {
  return readRememberedEmail().length > 0;
}

export function persistRememberedEmail(email: string, remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
    } else {
      localStorage.removeItem(REMEMBER_EMAIL_KEY);
    }
  } catch {
    /* ignore */
  }
}
