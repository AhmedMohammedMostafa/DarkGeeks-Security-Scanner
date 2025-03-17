import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch("http://localhost:5000/api/vault/items", {
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
          error: data.message || "Failed to fetch vault items",
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true, data: data.data });
  } catch (error) {
    console.error("Error fetching vault items:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch vault items" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/api/vault/items`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error adding vault item:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to add vault item",
      },
      { status: 500 }
    );
  }
}
