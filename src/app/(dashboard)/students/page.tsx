"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import Modal from "@/components/Modal";

interface Student {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface School {
  _id: string;
  name: string;
}

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [deleting, setDeleting] = useState<Student | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolId: "" });
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const fetchStudents = async (q?: string) => {
    const url = q ? `/api/students?search=${encodeURIComponent(q)}` : "/api/students";
    const res = await apiGet<Student[]>(url);
    if (res.success && res.data) setStudents(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
    if (user?.role === "super_admin") {
      apiGet<School[]>("/api/schools").then((res) => {
        if (res.success && res.data) setSchools(res.data);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchStudents(search), 300);
    return () => clearTimeout(timeout);
  }, [search]);

  if (!user || !["super_admin", "school_admin", "teacher"].includes(user.role)) {
    return <div className="text-red-600 font-medium">Access Denied</div>;
  }

  const canManage = ["super_admin", "school_admin"].includes(user.role);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", schoolId: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (student: Student) => {
    setEditing(student);
    setForm({ name: student.name, email: student.email, password: "", schoolId: "" });
    setError("");
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const body = editing
      ? { name: form.name, email: form.email, ...(form.password ? { password: form.password } : {}) }
      : {
          name: form.name,
          email: form.email,
          password: form.password,
          ...(user.role === "super_admin" && form.schoolId ? { schoolId: form.schoolId } : {}),
        };

    const res = editing
      ? await apiPut<Student>(`/api/students/${editing._id}`, body)
      : await apiPost<Student>("/api/students", body);

    if (res.success) {
      setModalOpen(false);
      fetchStudents(search);
    } else {
      setError(res.error || "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await apiDelete(`/api/students/${deleting._id}`);
    setDeleting(null);
    fetchStudents(search);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        {canManage && (
          <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
            Add Student
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {students.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{student.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{student.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(student.createdAt).toLocaleDateString()}</td>
                {canManage && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button onClick={() => openEdit(student)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                    <button onClick={() => setDeleting(student)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {students.length === 0 && (
              <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-gray-500">No students found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {canManage && (
        <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Student" : "Add Student"}>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password {editing ? "(leave blank to keep)" : "*"}
              </label>
              <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required={!editing} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
            </div>
            {user.role === "super_admin" && !editing && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School *</label>
                <select
                  value={form.schoolId}
                  onChange={(e) => setForm({ ...form, schoolId: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
                >
                  <option value="">-- Select School --</option>
                  {schools.map((s) => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
              </div>
            )}
            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
              {editing ? "Update" : "Create"}
            </button>
          </form>
        </Modal>
      )}

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Student">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            Are you sure you want to delete <span className="font-semibold">{deleting?.name}</span>?
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeleting(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
