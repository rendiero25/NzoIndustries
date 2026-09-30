const CHUNK_LOAD_FAILURE_PATTERN = /\bChunkLoadError\b|Loading (?:CSS )?chunk\s+[^\s]+\s+failed/i;

function getErrorMessage(reason: unknown): string {
  if (reason instanceof Error) {
    return `${reason.name}: ${reason.message}`;
  }

  if (typeof reason === "string") {
    return reason;
  }

  if (typeof reason === "object" && reason !== null) {
    const { message, name } = reason as { message?: unknown; name?: unknown };
    return `${typeof name === "string" ? name : ""}: ${typeof message === "string" ? message : ""}`;
  }

  return "";
}

export function isChunkLoadFailure(reason: unknown): boolean {
  return CHUNK_LOAD_FAILURE_PATTERN.test(getErrorMessage(reason));
}
