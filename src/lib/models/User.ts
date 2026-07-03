import mongoose, { Schema } from "mongoose";
import { IUser } from "@/types";

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["super_admin", "school_admin", "teacher", "student"],
    },
    schoolId: { type: Schema.Types.ObjectId, ref: "School", default: null },
  },
  { timestamps: true }
);

UserSchema.index({ schoolId: 1, role: 1 });

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);
