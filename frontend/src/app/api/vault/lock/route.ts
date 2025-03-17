import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = await fetch("http://localhost:5000/api/vault/lock", {
      method: "POST",
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
          error: data.message || "Failed to lock vault",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error locking vault:", error);
    return NextResponse.json(
      { success: false, error: "Failed to lock vault" },
      { status: 500 }
    );
  }
}
