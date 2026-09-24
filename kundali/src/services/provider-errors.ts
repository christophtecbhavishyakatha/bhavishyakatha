import { AppError } from "../utils/errors.js";

export function astrologyProviderError(
  operation: "d1" | "d9" | "vimshottari" | "panchang",
  error: unknown
): AppError {
  const details =
    error instanceof AppError ? error.details : undefined;

  console.error(
    `[Astrology Provider] ${operation} failed`,
    error
  );

  return new AppError(
    502,
    "Unable to calculate the requested Kundali right now.",
    "ASTROLOGY_CALCULATION_FAILED",
    {
      operation,
      ...(details !== undefined ? { provider: details } : {})
    }
  );
}
