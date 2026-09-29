import { NextResponse } from "next/server";

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

export function ok<T>(data: T, status?: number): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, data }, { status: status ?? 200 });
}

export function fail(error: string, status = 500): NextResponse<ApiResponse<never>> {
  return NextResponse.json({ success: false, error }, { status });
}
