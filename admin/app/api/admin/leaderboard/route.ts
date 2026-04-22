import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Example response
    const data = [
      { name: "User1", points: 120 },
      { name: "User2", points: 90 },
    ];

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}