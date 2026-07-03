import mongoose, { Schema } from "mongoose";
import { IAttendance } from "@/types";

const AttendanceSchema = new Schema<IAttendance>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    date: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["present", "absent", "late"],
    },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AttendanceSchema.index({ studentId: 1, subjectId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ schoolId: 1, date: 1 });

export default mongoose.models.Attendance ||
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);
