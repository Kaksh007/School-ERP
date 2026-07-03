import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole } from "@/lib/auth";
import School from "@/lib/models/School";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin");
    if (roleError) return roleError;

    await connectDB();
    const schools = await School.find().sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: schools });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin");
    if (roleError) return roleError;

    const { name, address, phone, email } = await request.json();

    if (!name) {
      return NextResponse.json({ success: false, error: "School name is required" }, { status: 400 });
    }

    await connectDB();
    const school = await School.create({ name, address, phone, email });

    return NextResponse.json({ success: true, data: school }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
