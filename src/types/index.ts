import { Types } from "mongoose";

export type UserRole = "super_admin" | "school_admin" | "teacher" | "student";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  schoolId: Types.ObjectId | null;
  createdAt: Date;
}

export interface ISchool {
  _id: Types.ObjectId;
  name: string;
  address: string;
  phone: string;
  email: string;
  createdAt: Date;
}

export interface ISubject {
  _id: Types.ObjectId;
  name: string;
  code: string;
  schoolId: Types.ObjectId;
  teacherId: Types.ObjectId | null;
  createdAt: Date;
}

export type AttendanceStatus = "present" | "absent" | "late";

export interface IAttendance {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  schoolId: Types.ObjectId;
  subjectId: Types.ObjectId;
  date: Date;
  status: AttendanceStatus;
  markedBy: Types.ObjectId;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  role: UserRole;
  schoolId: string | null;
  name: string;
  email: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
