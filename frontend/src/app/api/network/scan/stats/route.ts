import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
      throw new Error("API URL not configured");
    }

    console.log("Fetching from:", `${apiUrl}/api/scan/stats`); // Debug log

    const response = await fetch(`${apiUrl}/api/scan/stats`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Received data:", data); // Debug log

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch port scan stats");
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching port scan stats:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch port scan statistics",
      },
      { status: 500 }
    );
  }
}
