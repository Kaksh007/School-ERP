import Attendance from "@/lib/models/Attendance";

type AttendanceDoc = Awaited<ReturnType<typeof Attendance.find>>[number];

function getLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getEffectiveTime(record: AttendanceDoc): number {
  return new Date(record.updatedAt ?? record.createdAt ?? record.date).getTime();
}

export function getLatestStatusRecords(records: AttendanceDoc[]): AttendanceDoc[] {
  const chronological = [...records].sort((a, b) => getEffectiveTime(a) - getEffectiveTime(b));
  const latestByStudentSubjectDate = new Map<string, AttendanceDoc>();

  chronological.forEach((record) => {
    const dateKey = getLocalDateKey(new Date(record.date));
    const key = `${record.studentId?._id ?? record.studentId}:${record.subjectId?._id ?? record.subjectId}:${dateKey}`;
    const previous = latestByStudentSubjectDate.get(key);

    if (!previous || previous.status !== record.status) {
      latestByStudentSubjectDate.set(key, record);
    }
  });

  return Array.from(latestByStudentSubjectDate.values()).sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    return dateDiff || getEffectiveTime(b) - getEffectiveTime(a);
  });
}
