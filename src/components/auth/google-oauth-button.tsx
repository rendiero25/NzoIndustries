"use client";

import { GoogleIcon } from "@/components/auth/google-icon";
import { Button } from "@/components/ui/button";

type GoogleOAuthButtonProps = {
  label: string;
  isLoading: boolean;
  onClick: () => void;
  className?: string;
};

export function GoogleOAuthButton({
  label,
  isLoading,
  onClick,
  className = "-mt-4 w-full",
}: GoogleOAuthButtonProps) {
  return (
    <Button
      type="button"
      variant="dark"
      onClick={onClick}
      loading={isLoading}
      className={className}
    >
      {!isLoading ? <GoogleIcon data-icon="inline-start" /> : null}
      {label}
    </Button>
  );
}
