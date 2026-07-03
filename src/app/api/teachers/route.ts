import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole, getTenantFilter, hashPassword } from "@/lib/auth";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin", "school_admin");
    if (roleError) return roleError;

    const tenantFilter = getTenantFilter(user);

    // Super admin can filter by a specific school via query param
    const schoolIdParam = request.nextUrl.searchParams.get("schoolId");
    if (user.role === "super_admin" && schoolIdParam) {
      tenantFilter.schoolId = schoolIdParam;
    }

    await connectDB();

    const teachers = await User.find({ role: "teacher", ...tenantFilter })
      .select("-password")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: teachers });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin", "school_admin");
    if (roleError) return roleError;

    const { name, email, password, schoolId } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { success: false, error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    const targetSchoolId = user.role === "super_admin" ? schoolId : user.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json(
        { success: false, error: "School ID is required" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const teacher = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "teacher",
      schoolId: targetSchoolId,
    });

    const result = teacher.toObject();
    delete result.password;

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
