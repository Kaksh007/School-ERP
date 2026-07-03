"use client";

import { useEffect, useRef, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost } from "@/lib/api";

interface Student {
  _id: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  schoolId: string;
}

interface AttendanceRecord {
  _id: string;
  studentId: { _id: string; name: string; email: string };
  subjectId: { _id: string; name: string; code: string };
  date: string;
  status: "present" | "absent" | "late";
  markedBy: { name: string };
}

type Tab = "mark" | "history";

export default function AttendancePage() {
  const { user } = useAuth();
  const canMark = user && ["school_admin", "teacher"].includes(user.role);
  const [tab, setTab] = useState<Tab>("history");
  const hasSetInitialTab = useRef(false);

  // Once auth loads and canMark is confirmed, switch to the mark tab as default.
  // (On first render user is null so canMark is false; this corrects the tab after hydration.)
  useEffect(() => {
    if (canMark && !hasSetInitialTab.current) {
      hasSetInitialTab.current = true;
      setTab("mark");
    }
  }, [canMark]);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [statuses, setStatuses] = useState<Record<string, "present" | "absent" | "late">>({});
  const [originalStatuses, setOriginalStatuses] = useState<Record<string, "present" | "absent" | "late">>({});
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [filterDate, setFilterDate] = useState("");
  const [filterSubject, setFilterSubject] = useState("");
  const [filterStudent, setFilterStudent] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);

  const buildDefaultStatuses = (studentList: Student[]) => {
    const initial: Record<string, "present" | "absent" | "late"> = {};
    studentList.forEach((student) => {
      initial[student._id] = "present";
    });
    return initial;
  };

  const applyExistingAttendance = async (studentList: Student[], subjectId: string, selectedDate: string) => {
    const nextStatuses = buildDefaultStatuses(studentList);
    const savedStatuses: Record<string, "present" | "absent" | "late"> = {};
    const params = new URLSearchParams({ subjectId, date: selectedDate });
    const res = await apiGet<AttendanceRecord[]>(`/api/attendance?${params.toString()}`);

    if (res.success && res.data) {
      res.data.forEach((record) => {
        const studentId = record.studentId?._id;
        if (studentId && studentId in nextStatuses) {
          nextStatuses[studentId] = record.status;
          savedStatuses[studentId] = record.status;
        }
      });
    }

    setStatuses(nextStatuses);
    setOriginalStatuses(savedStatuses);
  };

  useEffect(() => {
    apiGet<Subject[]>("/api/subjects").then((res) => {
      if (res.success && res.data) setSubjects(res.data);
    });
  }, []);

  useEffect(() => {
    if (user?.role === "student" || canMark) return;

    const subject = subjects.find((s) => s._id === filterSubject);
    const url =
      user?.role === "super_admin" && subject?.schoolId
        ? `/api/students?schoolId=${subject.schoolId}`
        : "/api/students";

    apiGet<Student[]>(url).then((res) => {
      if (res.success && res.data) setStudents(res.data);
    });
  }, [canMark, filterSubject, subjects, user?.role]);

  // For non-super-admin: load students once (already scoped by JWT tenant)
  useEffect(() => {
    if (canMark && user?.role !== "super_admin") {
      apiGet<Student[]>("/api/students").then((res) => {
        if (res.success && res.data) {
          setStudents(res.data);
          const defaultStatuses = buildDefaultStatuses(res.data);
          setStatuses(defaultStatuses);
          setOriginalStatuses({});
        }
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canMark]);

  // For super_admin: reload students when subject changes (scoped to subject's school)
  useEffect(() => {
    if (!selectedSubject || user?.role !== "super_admin") return;

    const subject = subjects.find((s) => s._id === selectedSubject);
    if (!subject?.schoolId) return;

    setLoadingStudents(true);
    setStudents([]);
    setStatuses({});
    setOriginalStatuses({});

    apiGet<Student[]>(`/api/students?schoolId=${subject.schoolId}`).then((res) => {
      if (res.success && res.data) {
        setStudents(res.data);
        const defaultStatuses = buildDefaultStatuses(res.data);
        setStatuses(defaultStatuses);
        setOriginalStatuses({});
      }
      setLoadingStudents(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject]);

  const handleMarkAttendance = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSubject) return;

    setSubmitting(true);
    setMessage("");

    const changedRecords = Object.entries(statuses)
      .filter(([studentId, status]) => originalStatuses[studentId] !== status)
      .map(([studentId, status]) => ({
        studentId,
        status,
      }));

    if (changedRecords.length === 0) {
      setMessage("No attendance changes to save");
      setSubmitting(false);
      return;
    }

    const res = await apiPost<{ message: string }>("/api/attendance", {
      records: changedRecords,
      subjectId: selectedSubject,
      date,
    });

    if (res.success) {
      setMessage(res.data?.message || "Attendance marked successfully");
      await applyExistingAttendance(students, selectedSubject, date);
      if (tab === "history") fetchHistory();
    } else {
      setMessage(res.error || "Failed to mark attendance");
    }
    setSubmitting(false);
  };

  // Pre-populate statuses from existing attendance records when subject+date change
  useEffect(() => {
    if (!selectedSubject || !date || !canMark || students.length === 0) return;
    applyExistingAttendance(students, selectedSubject, date);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubject, date, students]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    const params = new URLSearchParams();
    if (filterDate) params.set("date", filterDate);
    if (filterSubject) params.set("subjectId", filterSubject);
    if (filterStudent && user?.role !== "student") params.set("studentId", filterStudent);

    const res = await apiGet<AttendanceRecord[]>(`/api/attendance?${params.toString()}`);
    if (res.success && res.data) setHistory(res.data);
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (tab === "history") fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, filterDate, filterSubject, filterStudent]);

  const markAll = (status: "present" | "absent" | "late") => {
    const updated: Record<string, "present" | "absent" | "late"> = {};
    students.forEach((s) => (updated[s._id] = status));
    setStatuses(updated);
  };

  const statusColors = {
    present: "bg-green-100 text-green-800",
    absent: "bg-red-100 text-red-800",
    late: "bg-yellow-100 text-yellow-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Attendance</h1>

      {canMark && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab("mark")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "mark" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            Mark Attendance
          </button>
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === "history" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
          >
            View History
          </button>
        </div>
      )}

      {tab === "mark" && canMark && (
        <form onSubmit={handleMarkAttendance} className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              >
                <option value="">Select Subject</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => markAll("present")} className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200">All Present</button>
            <button type="button" onClick={() => markAll("absent")} className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">All Absent</button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loadingStudents ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    <div className="flex justify-center"><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600" /></div>
                  </td></tr>
                ) : students.length === 0 ? (
                  <tr><td colSpan={2} className="px-4 py-8 text-center text-gray-500">
                    {user?.role === "super_admin" ? "Select a subject to load students" : "No students found"}
                  </td></tr>
                ) : students.map((student) => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-xs text-gray-500">{student.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        {(["present", "absent", "late"] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => setStatuses({ ...statuses, [student._id]: status })}
                            className={`px-3 py-1 rounded text-xs font-medium capitalize ${
                              statuses[student._id] === status
                                ? statusColors[status] + " ring-2 ring-offset-1 ring-gray-300"
                                : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {message && (
            <div className={`px-4 py-3 rounded-lg text-sm ${message.includes("success") || message.includes("marked") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || students.length === 0}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
          >
            {submitting ? "Submitting..." : "Mark Attendance"}
          </button>
        </form>
      )}

      {tab === "history" && (
        <div>
          <div className="flex gap-4 mb-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Subject</label>
              <select
                value={filterSubject}
                onChange={(e) => setFilterSubject(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
              >
                <option value="">All Subjects</option>
                {subjects.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            {user?.role !== "student" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Student</label>
                <select
                  value={filterStudent}
                  onChange={(e) => setFilterStudent(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                >
                  <option value="">All Students</option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>{student.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Marked By</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.map((record) => (
                    <tr key={record._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">{record.studentId?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.subjectId?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{new Date(record.date).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[record.status]}`}>
                          {record.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{record.markedBy?.name}</td>
                    </tr>
                  ))}
                  {history.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-500">No attendance records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
