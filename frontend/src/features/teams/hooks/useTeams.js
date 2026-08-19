import { useCallback, useEffect, useState } from "react";
import { getTeams } from "@/features/teams/services/teamService";
import { getErrorMessage } from "@/shared/utils/getErrorMessage";

export const useTeams = () => {
    const [teams, setTeams] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const loadTeams = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const data = await getTeams();
            setTeams(Array.isArray(data.results) ? data.results : Array.isArray(data) ? data : []);
        } catch (err) {
            setError(getErrorMessage(err));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadTeams();
    }, [loadTeams]);

    return { teams, loading, error, loadTeams };
};
