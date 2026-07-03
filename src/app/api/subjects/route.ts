import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole, getTenantFilter } from "@/lib/auth";
import Subject from "@/lib/models/Subject";
import User from "@/lib/models/User";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const tenantFilter = getTenantFilter(user);
    await connectDB();

    const filter: Record<string, unknown> = { ...tenantFilter };

    if (user.role === "teacher") {
      filter.teacherId = user.userId;
    }

    const subjects = await Subject.find(filter)
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, data: subjects });
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

    const { name, code, teacherId, schoolId } = await request.json();

    if (!name || !code) {
      return NextResponse.json(
        { success: false, error: "Subject name and code are required" },
        { status: 400 }
      );
    }

    const targetSchoolId = user.role === "super_admin" ? schoolId : user.schoolId;
    if (!targetSchoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    await connectDB();

    if (teacherId) {
      const teacher = await User.findOne({
        _id: teacherId,
        role: "teacher",
        schoolId: targetSchoolId,
      });

      if (!teacher) {
        return NextResponse.json(
          { success: false, error: "Teacher not found in this school" },
          { status: 400 }
        );
      }
    }

    const subject = await Subject.create({
      name,
      code,
      schoolId: targetSchoolId,
      teacherId: teacherId || null,
    });

    return NextResponse.json({ success: true, data: subject }, { status: 201 });
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && (error as { code: number }).code === 11000) {
      return NextResponse.json(
        { success: false, error: "Subject code already exists in this school" },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
