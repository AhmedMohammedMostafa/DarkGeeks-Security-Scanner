import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:5000/api/vault/status", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: data.message || "Failed to fetch vault status",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error) {
    console.error("Error fetching vault status:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vault status" },
      { status: 500 }
    );
  }
}
