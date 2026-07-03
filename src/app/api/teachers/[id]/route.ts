import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole, getTenantFilter, hashPassword } from "@/lib/auth";
import User from "@/lib/models/User";
import Subject from "@/lib/models/Subject";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "super_admin", "school_admin");
    if (roleError) return roleError;

    const { id } = await params;
    const tenantFilter = getTenantFilter(user);
    await connectDB();

    const teacher = await User.findOne({ _id: id, role: "teacher", ...tenantFilter }).select("-password");

    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: teacher });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

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

    const teacher = await User.findOne({ _id: id, role: "teacher", ...tenantFilter });
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    if (body.name) teacher.name = body.name;
    if (body.email) teacher.email = body.email.toLowerCase();
    if (body.password) teacher.password = await hashPassword(body.password);

    await teacher.save();

    const result = teacher.toObject();
    delete result.password;

    return NextResponse.json({ success: true, data: result });
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

    const teacher = await User.findOneAndDelete({ _id: id, role: "teacher", ...tenantFilter });
    if (!teacher) {
      return NextResponse.json({ success: false, error: "Teacher not found" }, { status: 404 });
    }

    await Subject.updateMany({ teacherId: id }, { teacherId: null });

    return NextResponse.json({ success: true, data: { message: "Teacher deleted" } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
