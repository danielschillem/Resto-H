export function isEmailValid(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isDateAfterOrEqual(a: string, b: string): boolean {
  return a >= b;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export type ValidationErrors = Record<string, string>;

export function showValidationAlert(errors: ValidationErrors): void {
  const msgs = Object.values(errors);
  alert(msgs.join("\n"));
}
