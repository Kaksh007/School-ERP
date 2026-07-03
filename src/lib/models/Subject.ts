import mongoose, { Schema } from "mongoose";
import { ISubject } from "@/types";

const SubjectSchema = new Schema<ISubject>(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

SubjectSchema.index({ schoolId: 1, code: 1 }, { unique: true });

export default mongoose.models.Subject || mongoose.model<ISubject>("Subject", SubjectSchema);
