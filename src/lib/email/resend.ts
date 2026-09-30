import "server-only";

import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);
export const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "noreply@nzo-industries.test";
export const FROM_NAME = process.env.RESEND_FROM_NAME ?? "NZO Industries";
export const FROM = `${FROM_NAME} <${FROM_EMAIL}>`;
export const ADMIN_EMAIL = process.env.RESEND_ADMIN_EMAIL ?? "admin@nzo-industries.test";
