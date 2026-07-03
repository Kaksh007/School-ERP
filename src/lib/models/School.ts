import mongoose, { Schema } from "mongoose";
import { ISchool } from "@/types";

const SchoolSchema = new Schema<ISchool>(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "", lowercase: true, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.School || mongoose.model<ISchool>("School", SchoolSchema);
