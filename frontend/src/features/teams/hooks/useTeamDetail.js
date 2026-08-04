import { useCallback, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getEnrollments } from "@/features/courses/services/courseService";
import {
    changeTeamLeader,
    getTeam,
    removeTeamMember,
} from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/untils/getErrorMessage";

export const useTeamDetail = (teamId) => {
    const [team, setTeam] = useState(null);
    const [enrollments, setEnrollments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const teamData = await getTeam(teamId);
            setTeam(teamData);

            if (teamData.course?.id) {
                const enrollmentsData = await getEnrollments();
                const items = enrollmentsData.results ?? enrollmentsData;
                setEnrollments(
                    items.filter(
                        (enrollment) =>
                            enrollment.course.id === teamData.course.id &&
                            enrollment.status === "APPROVED"
                    )
                );
            } else {
                setEnrollments([]);
            }
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        load();
    }, [load]);

    const handleRemoveMember = useCallback(
        async (studentId) => {
            setRemovingId(studentId);
            try {
                await removeTeamMember(teamId, studentId);
                toast.success("Estudiante eliminado del equipo");
                await load();
            } catch (err) {
                toast.error(getErrorMessage(err));
            } finally {
                setRemovingId(null);
            }
        },
        [teamId, load]
    );

    const handleChangeLeader = useCallback(
        async (studentId) => {
            try {
                await changeTeamLeader(teamId, studentId);
                toast.success("Líder del equipo actualizado");
                await load();
            } catch (err) {
                toast.error(getErrorMessage(err));
            }
        },
        [teamId, load]
    );

    return {
        team,
        enrollments,
        loading,
        error,
        reload: load,
        handleRemoveMember,
        removingId,
        handleChangeLeader,
    };
};
