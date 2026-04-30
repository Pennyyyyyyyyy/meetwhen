import { NextResponse } from "next/server";
import { Errs, type ErrDef } from "./errs";

export class ApiError extends Error {
  readonly def: ErrDef;
  readonly details?: unknown;

  constructor(def: ErrDef, details?: unknown) {
    super(def.message);
    this.def = def;
    this.details = details;
  }
}

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status });
}

export function fail(def: ErrDef, details?: unknown) {
  return NextResponse.json(
    { error: { code: def.code, message: def.message, details } },
    { status: def.status }
  );
}

export function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return fail(err.def, err.details);
  }
  console.error("Unhandled error:", err);
  return NextResponse.json(
    { error: { code: "INTERNAL_ERROR", message: "伺服器錯誤" } },
    { status: 500 }
  );
}

export { Errs };
