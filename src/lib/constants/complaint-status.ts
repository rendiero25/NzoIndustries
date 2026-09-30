export const COMPLAINT_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

export type ComplaintStatus = (typeof COMPLAINT_STATUSES)[number];
