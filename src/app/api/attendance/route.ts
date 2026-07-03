import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, requireRole, getTenantFilter } from "@/lib/auth";
import Attendance from "@/lib/models/Attendance";
import User from "@/lib/models/User";
import Subject from "@/lib/models/Subject";
import { getLatestStatusRecords } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const tenantFilter = getTenantFilter(user);
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get("date");
    const studentId = searchParams.get("studentId");
    const subjectId = searchParams.get("subjectId");

    await connectDB();

    const query: Record<string, unknown> = { ...tenantFilter };

    if (user.role === "student") {
      query.studentId = user.userId;
    }

    if (date) {
      const [y, m, d] = date.split("-").map(Number);
      const start = new Date(y, m - 1, d, 0, 0, 0, 0);
      const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
      query.date = { $gte: start, $lt: end };
    }

    if (studentId && user.role !== "student") {
      query.studentId = studentId;
    }

    if (subjectId) {
      query.subjectId = subjectId;
    }

    const attendance = await Attendance.find(query)
      .populate("studentId", "name email")
      .populate("subjectId", "name code")
      .populate("markedBy", "name");

    return NextResponse.json({ success: true, data: getLatestStatusRecords(attendance) });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const roleError = requireRole(user, "school_admin", "teacher");
    if (roleError) return roleError;

    const { records, subjectId, date } = await request.json();

    if (!records || !Array.isArray(records) || !subjectId || !date) {
      return NextResponse.json(
        { success: false, error: "Records array, subjectId, and date are required" },
        { status: 400 }
      );
    }

    await connectDB();

    // Derive schoolId from the subject so super_admin doesn't need to pass it
    const subject = await Subject.findById(subjectId);
    if (!subject) {
      return NextResponse.json({ success: false, error: "Subject not found" }, { status: 404 });
    }

    const schoolId = user.role === "super_admin"
      ? subject.schoolId.toString()
      : user.schoolId;

    if (!schoolId) {
      return NextResponse.json({ success: false, error: "School ID is required" }, { status: 400 });
    }

    const studentIds = records.map((r: { studentId: string }) => r.studentId);
    const students = await User.find({
      _id: { $in: studentIds },
      role: "student",
      schoolId,
    });

    if (students.length !== studentIds.length) {
      return NextResponse.json(
        { success: false, error: "Some students do not belong to this school" },
        { status: 400 }
      );
    }

    const [y, m, d] = (date as string).split("-").map(Number);
    const attendanceDate = new Date(Date.UTC(y, m - 1, d));

    const start = new Date(y, m - 1, d, 0, 0, 0, 0);
    const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
    const existingRecords = await Attendance.find({
      studentId: { $in: studentIds },
      subjectId,
      date: { $gte: start, $lt: end },
    });

    const latestExistingRecords = getLatestStatusRecords(existingRecords);
    const existingByStudent = new Map(
      latestExistingRecords.map((record) => [record.studentId.toString(), record])
    );

    const changedRecords = records.filter(
      (record: { studentId: string; status: string }) =>
        existingByStudent.get(record.studentId)?.status !== record.status
    );

    if (changedRecords.length === 0) {
      return NextResponse.json({
        success: true,
        data: { message: "No attendance changes to save" },
      });
    }

    const now = new Date();
    const ops = changedRecords.map((r: { studentId: string; status: string }) => {
      const existing = existingByStudent.get(r.studentId);

      return {
        updateOne: {
          filter: existing
            ? { _id: existing._id }
            : {
                studentId: r.studentId,
                subjectId,
                date: attendanceDate,
              },
          update: {
            $set: {
              status: r.status,
              schoolId,
              markedBy: user.userId,
              updatedAt: now,
            },
            $setOnInsert: {
              createdAt: now,
            },
          },
          upsert: !existing,
        },
      };
    });

    await Attendance.bulkWrite(ops);

    return NextResponse.json({
      success: true,
      data: { message: `Attendance updated for ${changedRecords.length} student${changedRecords.length === 1 ? "" : "s"}` },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
