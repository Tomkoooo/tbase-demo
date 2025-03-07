import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        return NextResponse.json({ message: "Data received", data: body });
    } catch (error: any) {
        return NextResponse.json({ message: "Error parsing request", error: error.message }, { status: 400 });
    }
}