import { toast as sonner } from "sonner";

export const toast = {
  success: (message: string, description?: string) => sonner.success(message, { description }),
  error: (message: string, description?: string) => sonner.error(message, { description }),
  info: (message: string, description?: string) => sonner.info(message, { description }),
  warning: (message: string, description?: string) => sonner.warning(message, { description }),
  loading: (message: string, description?: string) => sonner.loading(message, { description }),
  promise: sonner.promise,
  dismiss: sonner.dismiss,
};
