"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import Modal from "@/components/Modal";

interface Teacher {
  _id: string;
  name: string;
  email: string;
  createdAt: string;
}

interface School {
  _id: string;
  name: string;
}

export default function TeachersPage() {
  const { user } = useAuth();
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Teacher | null>(null);
  const [deleting, setDeleting] = useState<Teacher | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", schoolId: "" });
  const [error, setError] = useState("");

  const fetchTeachers = async () => {
    const res = await apiGet<Teacher[]>("/api/teachers");
    if (res.success && res.data) setTeachers(res.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchTeachers();
    if (user?.role === "super_admin") {
      apiGet<School[]>("/api/schools").then((res) => {
        if (res.success && res.data) setSchools(res.data);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  if (!user || !["super_admin", "school_admin"].includes(user.role)) {
    return <div className="text-red-600 font-medium">Access Denied</div>;
  }

  const openAdd = () => {
    setEditing(null);
    setForm({ name: "", email: "", password: "", schoolId: "" });
    setError("");
    setModalOpen(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditing(teacher);
    setForm({ name: teacher.name, email: teacher.email, password: "", schoolId: "" });
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
      ? await apiPut<Teacher>(`/api/teachers/${editing._id}`, body)
      : await apiPost<Teacher>("/api/teachers", body);

    if (res.success) {
      setModalOpen(false);
      fetchTeachers();
    } else {
      setError(res.error || "Something went wrong");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await apiDelete(`/api/teachers/${deleting._id}`);
    setDeleting(null);
    fetchTeachers();
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
        <h1 className="text-2xl font-bold text-gray-900">Teachers</h1>
        <button onClick={openAdd} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          Add Teacher
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {teachers.map((teacher) => (
              <tr key={teacher._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{teacher.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{teacher.email}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{new Date(teacher.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => openEdit(teacher)} className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                  <button onClick={() => setDeleting(teacher)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                </td>
              </tr>
            ))}
            {teachers.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No teachers found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit Teacher" : "Add Teacher"}>
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

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Teacher">
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
