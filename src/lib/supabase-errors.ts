interface SupabaseLikeError {
  code?: string;
  details?: string;
  hint?: string;
  message?: string;
}

function getErrorText(error: unknown) {
  if (!error || typeof error !== "object") {
    return "";
  }

  const { code, details, hint, message } = error as SupabaseLikeError;
  return [code, message, details, hint].filter(Boolean).join(" ");
}

export function isMissingRelationError(error: unknown, relationName: string) {
  const text = getErrorText(error).toLowerCase();
  const relation = relationName.toLowerCase();

  return (
    text.includes(`'public.${relation}'`) ||
    text.includes(`"${relation}"`) ||
    text.includes(`relation "${relation}" does not exist`) ||
    (text.includes(relation) && text.includes("schema cache")) ||
    (text.includes(relation) && text.includes("does not exist"))
  );
}

export function getErrorMessage(error: unknown, fallback = "Something went wrong") {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === "object" && "message" in error && typeof (error as SupabaseLikeError).message === "string") {
    return (error as SupabaseLikeError).message as string;
  }

  return fallback;
}
