import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getAuthUser, getTenantFilter } from "@/lib/auth";
import User from "@/lib/models/User";
import Subject from "@/lib/models/Subject";
import Attendance from "@/lib/models/Attendance";
import School from "@/lib/models/School";
import { getLatestStatusRecords } from "@/lib/attendance";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);
    if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (user.role === "super_admin") {
      const [totalSchools, totalTeachers, totalStudents, totalSubjects, todayAttendance] = await Promise.all([
        School.countDocuments(),
        User.countDocuments({ role: "teacher" }),
        User.countDocuments({ role: "student" }),
        Subject.countDocuments(),
        Attendance.find({
          date: { $gte: today, $lt: tomorrow },
        }),
      ]);

      const latestTodayAttendance = getLatestStatusRecords(todayAttendance);
      const present = latestTodayAttendance.filter((a) => a.status === "present").length;
      const absent = latestTodayAttendance.filter((a) => a.status === "absent").length;
      const late = latestTodayAttendance.filter((a) => a.status === "late").length;

      return NextResponse.json({
        success: true,
        data: {
          totalSchools,
          totalTeachers,
          totalStudents,
          totalSubjects,
          todayAttendance: {
            present,
            absent,
            late,
            total: latestTodayAttendance.length,
          },
        },
      });
    }

    const tenantFilter = getTenantFilter(user);

    if (user.role === "student") {
      const [totalSubjects, attendanceRecords] = await Promise.all([
        Subject.countDocuments(tenantFilter),
        Attendance.find({ studentId: user.userId }),
      ]);

      const latestAttendanceRecords = getLatestStatusRecords(attendanceRecords);
      const total = latestAttendanceRecords.length;
      const present = latestAttendanceRecords.filter((a) => a.status === "present").length;

      return NextResponse.json({
        success: true,
        data: {
          totalSubjects,
          attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
          totalClasses: total,
        },
      });
    }

    if (user.role === "teacher") {
      const teacherSubjects = await Subject.find({ ...tenantFilter, teacherId: user.userId });
      const subjectIds = teacherSubjects.map((subject) => subject._id);

      const [totalStudents, todayAttendance] = await Promise.all([
        User.countDocuments({ role: "student", ...tenantFilter }),
        Attendance.find({
          ...tenantFilter,
          subjectId: { $in: subjectIds },
          date: { $gte: today, $lt: tomorrow },
        }),
      ]);

      const latestTodayAttendance = getLatestStatusRecords(todayAttendance);
      const present = latestTodayAttendance.filter((a) => a.status === "present").length;
      const absent = latestTodayAttendance.filter((a) => a.status === "absent").length;
      const late = latestTodayAttendance.filter((a) => a.status === "late").length;

      return NextResponse.json({
        success: true,
        data: {
          totalStudents,
          totalSubjects: teacherSubjects.length,
          todayAttendance: {
            present,
            absent,
            late,
            total: latestTodayAttendance.length,
          },
        },
      });
    }

    const [totalStudents, totalTeachers, totalSubjects, todayAttendance] = await Promise.all([
      User.countDocuments({ role: "student", ...tenantFilter }),
      User.countDocuments({ role: "teacher", ...tenantFilter }),
      Subject.countDocuments(tenantFilter),
      Attendance.find({
        ...tenantFilter,
        date: { $gte: today, $lt: tomorrow },
      }),
    ]);

    const latestTodayAttendance = getLatestStatusRecords(todayAttendance);
    const present = latestTodayAttendance.filter((a) => a.status === "present").length;
    const absent = latestTodayAttendance.filter((a) => a.status === "absent").length;
    const late = latestTodayAttendance.filter((a) => a.status === "late").length;

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        totalTeachers,
        totalSubjects,
        todayAttendance: {
          present,
          absent,
          late,
          total: latestTodayAttendance.length,
        },
      },
    });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
