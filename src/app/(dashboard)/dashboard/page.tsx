"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";
import StatsCard from "@/components/StatsCard";

interface DashboardData {
  totalStudents?: number;
  totalTeachers?: number;
  totalSubjects?: number;
  totalSchools?: number;
  attendancePercentage?: number;
  totalClasses?: number;
  todayAttendance?: {
    present: number;
    absent: number;
    late: number;
    total: number;
  };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<DashboardData>("/api/dashboard").then((res) => {
      if (res.success && res.data) setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {user?.role === "super_admin" && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
          <StatsCard title="Total Schools" value={data.totalSchools ?? 0} color="blue" />
          <StatsCard title="Teachers" value={data.totalTeachers ?? 0} color="green" />
          <StatsCard title="Students" value={data.totalStudents ?? 0} color="purple" />
          <StatsCard title="Subjects" value={data.totalSubjects ?? 0} color="blue" />
          <StatsCard
            title="Today's Attendance"
            value={data.todayAttendance?.total ?? 0}
            subtitle={`${data.todayAttendance?.present ?? 0} present, ${data.todayAttendance?.absent ?? 0} absent, ${data.todayAttendance?.late ?? 0} late`}
            color="yellow"
          />
        </div>
      )}

      {user?.role === "student" && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="My Subjects" value={data.totalSubjects ?? 0} color="blue" />
          <StatsCard
            title="Attendance"
            value={`${data.attendancePercentage ?? 0}%`}
            subtitle={`${data.totalClasses ?? 0} classes`}
            color="green"
          />
        </div>
      )}

      {user?.role === "school_admin" && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Students" value={data.totalStudents ?? 0} color="blue" />
          <StatsCard title="Teachers" value={data.totalTeachers ?? 0} color="green" />
          <StatsCard title="Subjects" value={data.totalSubjects ?? 0} color="purple" />
          <StatsCard
            title="Today's Attendance"
            value={data.todayAttendance?.total ?? 0}
            subtitle={`${data.todayAttendance?.present ?? 0} present, ${data.todayAttendance?.absent ?? 0} absent, ${data.todayAttendance?.late ?? 0} late`}
            color="yellow"
          />
        </div>
      )}

      {user?.role === "teacher" && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard title="Students" value={data.totalStudents ?? 0} color="blue" />
          <StatsCard title="My Subjects" value={data.totalSubjects ?? 0} color="purple" />
          <StatsCard
            title="Today's Attendance"
            value={data.todayAttendance?.total ?? 0}
            subtitle={`${data.todayAttendance?.present ?? 0} present, ${data.todayAttendance?.absent ?? 0} absent, ${data.todayAttendance?.late ?? 0} late`}
            color="yellow"
          />
        </div>
      )}
    </div>
  );
}
