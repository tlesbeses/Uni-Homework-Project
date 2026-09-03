import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useCourses } from "@/features/courses/hooks/useCourses";
import { getSections } from "@/features/courses/services/courseService";
import {
    exportSectionGrades,
    getSectionGradesReport,
} from "@/features/grades/services/gradeService";
import { useGradeStudent } from "@/features/grades/hooks/useGradeMutations";
import { downloadBlob } from "@/shared/utils/downloadBlob";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";
import { SearchInput } from "@/shared/components/SearchInput";

function EditableGradeCell({
    score,
    maxScore,
    studentId,
    assignmentId,
    onSaved,
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState("");
    const [saving, setSaving] = useState(false);
    const inputRef = useRef(null);
    const busyRef = useRef(false);

    const gradeStudentMutation = useGradeStudent();

    useEffect(() => {
        if (editing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [editing]);

    const display =
        score !== undefined && score !== null ? String(score) : "__";

    const commit = async () => {
        if (busyRef.current) {
            return;
        }
        const trimmed = draft.trim();
        if (trimmed === "" || trimmed === display) {
            setEditing(false);
            return;
        }
        const num = Number(trimmed);
        if (Number.isNaN(num) || num < 0 || num > maxScore) {
            toast.error(`La nota debe estar entre 0 y ${maxScore}.`);
            setEditing(false);
            return;
        }
        busyRef.current = true;
        setSaving(true);
        try {
            await gradeStudentMutation.mutateAsync({
                assignmentId,
                studentId,
                score: num,
            });
            onSaved(studentId, assignmentId, num);
            toast.success("Nota guardada.");
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setSaving(false);
            setEditing(false);
            busyRef.current = false;
        }
    };

    if (editing) {
        return (
            <td className="px-2 py-1 text-center">
                <div className="flex items-center justify-center gap-0.5">
                    <input
                        ref={inputRef}
                        type="text"
                        inputMode="decimal"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") { commit(); }
                            if (e.key === "Escape") { setEditing(false); }
                        }}
                        onBlur={commit}
                        disabled={saving}
                        className="w-14 px-1 py-0.5 text-center text-sm text-gray-700 border border-indigo-400 rounded outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-gray-400">/{maxScore}</span>
                </div>
            </td>
        );
    }

    return (
        <td
            className="px-4 py-3 text-center cursor-pointer hover:bg-indigo-50 transition rounded"
            onClick={() => {
                setDraft(score !== undefined ? String(score) : "");
                setEditing(true);
            }}
        >
            <span
                className={`inline-block px-2 py-0.5 rounded text-sm ${
                    score !== undefined && score !== null
                        ? "font-semibold text-gray-800"
                        : "text-gray-400"
                }`}
            >
                {display} /{maxScore}
            </span>
        </td>
    );
}

export const GradesReportPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialCourseId = searchParams.get("course") ?? "";
    const initialSectionId = searchParams.get("section") ?? "";

    const { courses, loading: coursesLoading } = useCourses();
    const [courseId, setCourseId] = useState(initialCourseId);
    const [sections, setSections] = useState([]);
    const [sectionsLoading, setSectionsLoading] = useState(false);
    const [sectionId, setSectionId] = useState(initialSectionId);

    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [exporting, setExporting] = useState(false);

    const [search, setSearch] = useState("");
    const [orderBy, setOrderBy] = useState("last_name");

    useEffect(() => {
        if (!courseId) {
            setSections([]);
            return;
        }
        setSectionsLoading(true);
        getSections(courseId, { page_size: 100 })
            .then((data) => {
                const list = data?.results ?? data ?? [];
                setSections(list);
                setSectionId((current) =>
                    current && list.some((s) => String(s.id) === String(current))
                        ? current
                        : (list[0]?.id ?? "")
                );
            })
            .catch(() => setSections([]))
            .finally(() => setSectionsLoading(false));
    }, [courseId]);

    useEffect(() => {
        if (!sectionId) {
            setReport(null);
            return;
        }
        let active = true;
        setLoading(true);
        setError("");
        getSectionGradesReport(sectionId)
            .then((data) => {
                if (active) {
                    setReport(data);
                    setSearch("");
                }
            })
            .catch((err) => {
                if (active) {
                    setError(getErrorMessage(err));
                }
            })
            .finally(() => {
                if (active) {
                    setLoading(false);
                }
            });
        return () => {
            active = false;
        };
    }, [sectionId]);

    const syncUrl = useCallback(
        (newCourse, newSection) => {
            const params = new URLSearchParams();
            if (newCourse) { params.set("course", newCourse); }
            if (newSection) { params.set("section", newSection); }
            setSearchParams(params, { replace: true });
        },
        [setSearchParams]
    );

    const handleCourseChange = (e) => {
        const value = e.target.value;
        setCourseId(value);
        setSectionId("");
        setReport(null);
        syncUrl(value, "");
    };

    const handleSectionChange = (e) => {
        const value = e.target.value;
        setSectionId(value);
        syncUrl(courseId, value);
    };

    const handleExport = async () => {
        if (!sectionId) { return; }
        setExporting(true);
        try {
            const blob = await exportSectionGrades(sectionId);
            downloadBlob(
                blob,
                `notas_${report?.course ?? "curso"}_${report?.section ?? "grupo"}.xlsx`
            );
            toast.success("Notas exportadas a Excel.");
        } catch (err) {
            toast.error(getErrorMessage(err));
        } finally {
            setExporting(false);
        }
    };

    const handleGradeSaved = useCallback((studentId, assignmentId, newScore) => {
        setReport((prev) => {
            if (!prev) { return prev; }
            const nextStudents = prev.students.map((s) => {
                if (s.id !== studentId) { return s; }
                const nextGrades = { ...s.grades, [String(assignmentId)]: newScore };
                const total = Object.values(nextGrades).reduce(
                    (sum, v) => sum + Number(v),
                    0
                );
                return { ...s, grades: nextGrades, total };
            });
            return { ...prev, students: nextStudents };
        });
    }, []);

    const filteredStudents = useMemo(() => {
        if (!report) { return []; }
        const q = search.trim().toLowerCase();
        let list = report.students;
        if (q) {
            list = list.filter((s) => s.name.toLowerCase().includes(q));
        }
        const sorted = [...list];
        sorted.sort((a, b) => {
            if (orderBy === "last_name") {
                const aLast = a.name.split(/\s+/).pop() ?? "";
                const bLast = b.name.split(/\s+/).pop() ?? "";
                return aLast.localeCompare(bLast, "es");
            }
            return a.name.localeCompare(b.name, "es");
        });
        return sorted;
    }, [report, search, orderBy]);

    return (
        <div className="space-y-6 max-w-6xl">
            <Link
                to="/grades"
                className="text-sm text-indigo-600 hover:text-indigo-800"
            >
                &larr; Volver a evaluaciones
            </Link>

            <div>
                <h1 className="text-2xl font-bold text-gray-800">
                    Reporte de calificaciones
                </h1>
                <p className="text-sm text-gray-500">
                    Consulta las notas de todos los estudiantes por sección.
                </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Curso
                        </label>
                        <select
                            value={courseId}
                            onChange={handleCourseChange}
                            disabled={coursesLoading}
                            className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">
                                {coursesLoading ? "Cargando..." : "Selecciona un curso"}
                            </option>
                            {courses.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.title}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                            Sección
                        </label>
                        <select
                            value={sectionId}
                            onChange={handleSectionChange}
                            disabled={!courseId || sectionsLoading}
                            className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="">
                                {sectionsLoading
                                    ? "Cargando..."
                                    : !courseId
                                        ? "Primero selecciona un curso"
                                        : "Selecciona una sección"}
                            </option>
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {loading && (
                <p className="text-sm text-gray-500">Cargando reporte...</p>
            )}

            {error && (
                <p className="text-sm text-red-500">{error}</p>
            )}

            {report && !loading && (
                <>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">
                                {report.course} &mdash; {report.section}
                            </h2>
                            <p className="text-sm text-gray-500">
                                {filteredStudents.length} estudiante{filteredStudents.length !== 1 ? "s" : ""}
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={handleExport}
                            disabled={exporting}
                            className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition disabled:opacity-50"
                        >
                            {exporting ? "Exportando..." : "Descargar Excel"}
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                            <SearchInput
                                value={search}
                                onChange={setSearch}
                                placeholder="Buscar estudiante por nombre..."
                            />
                        </div>
                        <select
                            value={orderBy}
                            onChange={(e) => setOrderBy(e.target.value)}
                            className="px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                            <option value="last_name">Ordenar por apellido</option>
                            <option value="first_name">Ordenar por nombre</option>
                        </select>
                    </div>

                    {report.students.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            No hay estudiantes inscritos en esta sección.
                        </p>
                    ) : filteredStudents.length === 0 ? (
                        <p className="text-sm text-gray-500">
                            Ningún estudiante coincide con &laquo;{search.trim()}&raquo;.
                        </p>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-200">
                                        <th className="px-4 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">
                                            Estudiante
                                        </th>
                                        {report.assignments.map((a) => (
                                            <th
                                                key={a.id}
                                                className="px-4 py-3 text-center font-semibold text-gray-700 whitespace-nowrap"
                                            >
                                                {a.title}
                                            </th>
                                        ))}
                                        <th className="px-4 py-3 text-center font-semibold text-gray-700">
                                            Total
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredStudents.map((student) => (
                                        <tr
                                            key={student.id}
                                            className="border-b border-gray-100 last:border-0"
                                        >
                                            <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                                                {student.name}
                                            </td>
                                            {report.assignments.map((a) => (
                                                <EditableGradeCell
                                                    key={`${student.id}-${a.id}`}
                                                    score={student.grades[String(a.id)]}
                                                    maxScore={a.max_score}
                                                    studentId={student.id}
                                                    assignmentId={a.id}
                                                    onSaved={handleGradeSaved}
                                                />
                                            ))}
                                            <td className="px-4 py-3 text-center font-bold text-gray-800">
                                                {student.total}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};
