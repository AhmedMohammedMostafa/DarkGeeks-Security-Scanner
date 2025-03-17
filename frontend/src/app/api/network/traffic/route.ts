import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/anomaly/network-traffic`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching network traffic:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch network traffic data",
      },
      { status: 500 }
    );
  }
}
