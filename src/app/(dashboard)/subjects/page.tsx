"use client";

import { useEffect, useState, FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import Modal from "@/components/Modal";

interface Teacher {
  _id: string;
  name: string;
  email: string;
}

interface Subject {
  _id: string;
  name: string;
  code: string;
  schoolId: string;
  teacherId: Teacher | null;
  createdAt: string;
}

interface School {
  _id: string;
  name: string;
}

export default function SubjectsPage() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [assignTeachers, setAssignTeachers] = useState<Teacher[]>([]);
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [assignModal, setAssignModal] = useState<Subject | null>(null);
  const [deleting, setDeleting] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: "", code: "", teacherId: "", schoolId: "" });
  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [assignError, setAssignError] = useState("");
  const [error, setError] = useState("");

  const canManage = user && ["super_admin", "school_admin"].includes(user.role);

  const fetchSubjects = async () => {
    const res = await apiGet<Subject[]>("/api/subjects");
    if (res.success && res.data) setSubjects(res.data);
    setLoading(false);
  };

  const fetchTeachersForSchool = async (schoolId: string): Promise<Teacher[]> => {
    const url = user?.role === "super_admin" && schoolId
      ? `/api/teachers?schoolId=${schoolId}`
      : "/api/teachers";
    const res = await apiGet<Teacher[]>(url);
    return res.success && res.data ? res.data : [];
  };

  useEffect(() => {
    fetchSubjects();
    if (canManage) {
      apiGet<Teacher[]>("/api/teachers").then((res) => {
        if (res.success && res.data) setAllTeachers(res.data);
      });
    }
    if (user?.role === "super_admin") {
      apiGet<School[]>("/api/schools").then((res) => {
        if (res.success && res.data) setSchools(res.data);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When school changes in create form, reload teachers for that school
  useEffect(() => {
    if (user?.role !== "super_admin") {
      setFilteredTeachers(allTeachers);
      return;
    }
    if (!form.schoolId) {
      setFilteredTeachers([]);
      return;
    }
    fetchTeachersForSchool(form.schoolId).then(setFilteredTeachers);
    setForm((prev) => ({ ...prev, teacherId: "" }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.schoolId, allTeachers]);

  // For school_admin always use allTeachers
  useEffect(() => {
    if (user?.role !== "super_admin") {
      setFilteredTeachers(allTeachers);
    }
  }, [allTeachers, user?.role]);

  const openAssignModal = async (subject: Subject) => {
    setAssignModal(subject);
    setSelectedTeacher(subject.teacherId?._id ?? "");
    setAssignError("");
    // Load teachers scoped to the subject's school
    const teachers = await fetchTeachersForSchool(subject.schoolId);
    setAssignTeachers(teachers);
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await apiPost<Subject>("/api/subjects", {
      name: form.name,
      code: form.code,
      teacherId: form.teacherId || undefined,
      ...(user?.role === "super_admin" && form.schoolId ? { schoolId: form.schoolId } : {}),
    });

    if (res.success) {
      setModalOpen(false);
      fetchSubjects();
    } else {
      setError(res.error || "Something went wrong");
    }
  };

  const handleAssign = async (e: FormEvent) => {
    e.preventDefault();
    if (!assignModal) return;
    setAssignError("");

    const res = await apiPut<Subject>(`/api/subjects/${assignModal._id}`, {
      teacherId: selectedTeacher,
    });

    if (res.success) {
      setAssignModal(null);
      setSelectedTeacher("");
      fetchSubjects();
    } else {
      setAssignError(res.error || "Failed to assign teacher");
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    await apiDelete(`/api/subjects/${deleting._id}`);
    setDeleting(null);
    fetchSubjects();
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
        <h1 className="text-2xl font-bold text-gray-900">Subjects</h1>
        {canManage && (
          <button
            onClick={() => {
              setForm({ name: "", code: "", teacherId: "", schoolId: "" });
              setFilteredTeachers(user?.role === "super_admin" ? [] : allTeachers);
              setError("");
              setModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Create Subject
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teacher</th>
              {canManage && <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {subjects.map((subject) => (
              <tr key={subject._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">{subject.name}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{subject.code}</td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {subject.teacherId ? subject.teacherId.name : <span className="text-gray-400 italic">Unassigned</span>}
                </td>
                {canManage && (
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      onClick={() => openAssignModal(subject)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      Assign Teacher
                    </button>
                    <button onClick={() => setDeleting(subject)} className="text-red-600 hover:text-red-800 text-sm">Delete</button>
                  </td>
                )}
              </tr>
            ))}
            {subjects.length === 0 && (
              <tr><td colSpan={canManage ? 4 : 3} className="px-4 py-8 text-center text-gray-500">No subjects found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Subject Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create Subject">
        <form onSubmit={handleCreate} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Subject Code *</label>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white" />
          </div>
          {user?.role === "super_admin" && (
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Assign Teacher (optional)
              {user?.role === "super_admin" && !form.schoolId && (
                <span className="text-gray-400 font-normal ml-1">— select a school first</span>
              )}
            </label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
              disabled={user?.role === "super_admin" && !form.schoolId}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white disabled:bg-gray-100 disabled:text-gray-400"
            >
              <option value="">-- None --</option>
              {filteredTeachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">Create</button>
        </form>
      </Modal>

      {/* Assign Teacher Modal */}
      <Modal isOpen={!!assignModal} onClose={() => { setAssignModal(null); setSelectedTeacher(""); }} title="Assign Teacher">
        <form onSubmit={handleAssign} className="space-y-4">
          {assignError && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">{assignError}</div>}
          <p className="text-sm text-gray-600">
            Subject: <strong className="text-gray-900">{assignModal?.name} ({assignModal?.code})</strong>
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Teacher</label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 bg-white"
            >
              <option value="">-- None --</option>
              {assignTeachers.map((t) => (
                <option key={t._id} value={t._id}>{t.name} ({t.email})</option>
              ))}
            </select>
            {assignTeachers.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">No teachers found for this school.</p>
            )}
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 font-medium">
            Assign Teacher
          </button>
        </form>
      </Modal>

      <Modal isOpen={!!deleting} onClose={() => setDeleting(null)} title="Delete Subject">
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
