"use client";

import { MfaForm } from "./mfa-form";

export function PeriodChangeForm() {
  return <MfaForm mode="period-change" periodSeconds={60} />;
}
