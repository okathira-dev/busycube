export interface GoogleFedCmResult {
  readonly credential?: string;
  readonly select_by?: string;
}

/** Accepts only a non-empty credential produced by a manual FedCM flow. */
export function isManualGoogleFedCm(result: unknown): boolean {
  if (!result || typeof result !== "object") return false;
  const value = result as Partial<GoogleFedCmResult>;
  return (
    value.select_by === "fedcm" &&
    typeof value.credential === "string" &&
    value.credential.trim().length > 0
  );
}
