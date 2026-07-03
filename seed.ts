import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/school_erp";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  role: { type: String, enum: ["super_admin", "school_admin", "teacher", "student"] },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School", default: null },
}, { timestamps: true });

const SchoolSchema = new mongoose.Schema({
  name: String,
  address: String,
  phone: String,
  email: { type: String, lowercase: true },
}, { timestamps: true });

const SubjectSchema = new mongoose.Schema({
  name: String,
  code: String,
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

const AttendanceSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  schoolId: { type: mongoose.Schema.Types.ObjectId, ref: "School" },
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: "Subject" },
  date: Date,
  status: { type: String, enum: ["present", "absent", "late"] },
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model("User", UserSchema);
const School = mongoose.models.School || mongoose.model("School", SchoolSchema);
const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);
const Attendance = mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);

async function seed() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected. Seeding data...\n");

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    School.deleteMany({}),
    Subject.deleteMany({}),
    Attendance.deleteMany({}),
  ]);

  const hash = (pw: string) => bcrypt.hashSync(pw, 12);

  // Create Super Admin
  const superAdmin = await User.create({
    name: "Super Admin",
    email: "superadmin@erp.com",
    password: hash("admin123"),
    role: "super_admin",
    schoolId: null,
  });
  console.log("Created Super Admin: superadmin@erp.com / admin123");

  // Create Schools
  const school1 = await School.create({
    name: "Delhi Public School",
    address: "123 Main Road, New Delhi",
    phone: "+91 11 2345 6789",
    email: "info@dps.edu",
  });

  const school2 = await School.create({
    name: "St. Mary's School",
    address: "456 Church Street, Mumbai",
    phone: "+91 22 9876 5432",
    email: "info@stmarys.edu",
  });
  console.log("Created 2 Schools: Delhi Public School, St. Mary's School");

  // Create School Admins
  const admin1 = await User.create({
    name: "Rajesh Kumar",
    email: "admin@dps.edu",
    password: hash("admin123"),
    role: "school_admin",
    schoolId: school1._id,
  });

  const admin2 = await User.create({
    name: "Priya Sharma",
    email: "admin@stmarys.edu",
    password: hash("admin123"),
    role: "school_admin",
    schoolId: school2._id,
  });
  console.log("Created 2 School Admins: admin@dps.edu, admin@stmarys.edu");

  // Create Teachers
  const teacher1 = await User.create({
    name: "Anita Desai",
    email: "anita@dps.edu",
    password: hash("teacher123"),
    role: "teacher",
    schoolId: school1._id,
  });

  const teacher2 = await User.create({
    name: "Vikram Singh",
    email: "vikram@dps.edu",
    password: hash("teacher123"),
    role: "teacher",
    schoolId: school1._id,
  });

  const teacher3 = await User.create({
    name: "Sarah Thomas",
    email: "sarah@stmarys.edu",
    password: hash("teacher123"),
    role: "teacher",
    schoolId: school2._id,
  });

  const teacher4 = await User.create({
    name: "John D'Souza",
    email: "john@stmarys.edu",
    password: hash("teacher123"),
    role: "teacher",
    schoolId: school2._id,
  });
  console.log("Created 4 Teachers (2 per school)");

  // Create Students
  const studentData = [
    { name: "Amit Patel", email: "amit@dps.edu", schoolId: school1._id },
    { name: "Neha Gupta", email: "neha@dps.edu", schoolId: school1._id },
    { name: "Rohit Verma", email: "rohit@dps.edu", schoolId: school1._id },
    { name: "Sunita Rao", email: "sunita@dps.edu", schoolId: school1._id },
    { name: "Michael Fernandez", email: "michael@stmarys.edu", schoolId: school2._id },
    { name: "Lisa Mendes", email: "lisa@stmarys.edu", schoolId: school2._id },
    { name: "David Lobo", email: "david@stmarys.edu", schoolId: school2._id },
    { name: "Maria Gomes", email: "maria@stmarys.edu", schoolId: school2._id },
  ];

  const students = await User.insertMany(
    studentData.map((s) => ({
      ...s,
      password: hash("student123"),
      role: "student",
    }))
  );
  console.log("Created 8 Students (4 per school)");

  // Create Subjects
  const sub1 = await Subject.create({ name: "Mathematics", code: "MATH101", schoolId: school1._id, teacherId: teacher1._id });
  const sub2 = await Subject.create({ name: "English", code: "ENG101", schoolId: school1._id, teacherId: teacher2._id });
  const sub3 = await Subject.create({ name: "Physics", code: "PHY101", schoolId: school2._id, teacherId: teacher3._id });
  const sub4 = await Subject.create({ name: "Chemistry", code: "CHEM101", schoolId: school2._id, teacherId: teacher4._id });
  console.log("Created 4 Subjects (2 per school, assigned to teachers)");

  // Create sample attendance for today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const attendanceRecords = [];
  const school1Students = students.filter((s) => s.schoolId!.toString() === school1._id.toString());
  const school2Students = students.filter((s) => s.schoolId!.toString() === school2._id.toString());

  const statusOptions: ("present" | "absent" | "late")[] = ["present", "present", "present", "late"];

  for (let i = 0; i < school1Students.length; i++) {
    attendanceRecords.push({
      studentId: school1Students[i]._id,
      schoolId: school1._id,
      subjectId: sub1._id,
      date: today,
      status: statusOptions[i % statusOptions.length],
      markedBy: teacher1._id,
    });
  }

  for (let i = 0; i < school2Students.length; i++) {
    attendanceRecords.push({
      studentId: school2Students[i]._id,
      schoolId: school2._id,
      subjectId: sub3._id,
      date: today,
      status: statusOptions[i % statusOptions.length],
      markedBy: teacher3._id,
    });
  }

  await Attendance.insertMany(attendanceRecords);
  console.log("Created sample attendance records for today");

  console.log("\n--- Seed Complete ---");
  console.log("\nLogin Credentials:");
  console.log("==================");
  console.log("Super Admin:    superadmin@erp.com    / admin123");
  console.log("DPS Admin:      admin@dps.edu         / admin123");
  console.log("St Mary Admin:  admin@stmarys.edu     / admin123");
  console.log("DPS Teacher:    anita@dps.edu         / teacher123");
  console.log("DPS Teacher:    vikram@dps.edu        / teacher123");
  console.log("SM Teacher:     sarah@stmarys.edu     / teacher123");
  console.log("SM Teacher:     john@stmarys.edu      / teacher123");
  console.log("DPS Student:    amit@dps.edu          / student123");
  console.log("SM Student:     michael@stmarys.edu   / student123");

  await mongoose.disconnect();
  console.log("\nDisconnected from MongoDB.");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
