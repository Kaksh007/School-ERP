import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole, getTenantFilter } from "@/lib/auth";
import Subject from "@/lib/models/Subject";
import User from "@/lib/models/User";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin", "school_admin");
    if (roleError) return roleError;

    const { id } = await params;
    const tenantFilter = getTenantFilter(user);
    const body = await request.json();

    await connectDB();

    const subject = await Subject.findOne({ _id: id, ...tenantFilter });
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    if (body.teacherId) {
      const teacher = await User.findOne({
        _id: body.teacherId,
        role: "teacher",
        schoolId: subject.schoolId,
      });
      if (!teacher) {
        return NextResponse.json(
          { success: false, error: "Teacher not found in this school" },
          { status: 400 }
        );
      }
      subject.teacherId = body.teacherId;
    }

    if (body.name) subject.name = body.name;
    if (body.code) subject.code = body.code;

    await subject.save();

    return NextResponse.json({ success: true, data: subject });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin", "school_admin");
    if (roleError) return roleError;

    const { id } = await params;
    const tenantFilter = getTenantFilter(user);
    await connectDB();

    const subject = await Subject.findOneAndDelete({ _id: id, ...tenantFilter });
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { message: "Subject deleted" } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
