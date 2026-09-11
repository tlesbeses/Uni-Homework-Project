import { Link } from "react-router-dom";
import { SelectField } from "@/shared/components/ui/SelectField";
import {
    DOT_COLORS,
    formatScore,
} from "@/features/grades/components/grading/gradingUtils";

export const TeamListPanel = ({
    sections,
    sectionFilter,
    setSectionFilter,
    teamsLoading,
    teamCount,
    visibleTeams,
    ungradedTeams,
    gradedTeams,
    selectedTeamId,
    handleSelectTeam,
    teamNameQuery,
    setTeamNameQuery,
    maxScore,
    getTeamGrade,
}) => {
    return (
        <aside className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span aria-hidden>👥</span> Todos los equipos
                </h2>
                <span className="text-xs text-gray-400">
                    {visibleTeams.length}
                </span>
            </div>

            <input
                type="search"
                value={teamNameQuery}
                onChange={(e) => setTeamNameQuery(e.target.value)}
                placeholder="Filtrar por nombre..."
                className="w-full px-3 py-2 rounded-lg border outline-none transition text-sm text-gray-700 border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />

            {sections.length > 0 && (
                <div>
                    <SelectField
                        compact
                        label="Grupo de clase"
                        value={sectionFilter}
                        onChange={(e) => setSectionFilter(e.target.value)}
                    >
                        {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.name}
                            </option>
                        ))}
                    </SelectField>
                    {sectionFilter && (
                        <Link
                            to={`/grades/report?section=${sectionFilter}`}
                            className="mt-2 block w-full px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-700 hover:bg-emerald-100 transition text-center"
                        >
                            Ver reporte
                        </Link>
                    )}
                </div>
            )}

            {teamsLoading ? (
                <p className="text-sm text-gray-500">Cargando equipos...</p>
            ) : teamCount === 0 ? (
                <p className="text-sm text-gray-500">
                    Este curso no tiene equipos.
                </p>
            ) : visibleTeams.length === 0 ? (
                <p className="text-sm text-gray-500">
                    Ningún equipo coincide con el filtro.
                </p>
            ) : (
                <div className="space-y-3 -mx-2">
                    {ungradedTeams.length > 0 && (
                        <div>
                            <p className="px-2 mb-1 text-xs font-semibold text-amber-600 uppercase tracking-wider">
                                Sin calificar ({ungradedTeams.length})
                            </p>
                            <ul className="divide-y divide-gray-100">
                                {ungradedTeams.map((team, index) => {
                                    const isSelected =
                                        String(selectedTeamId) ===
                                        String(team.id);
                                    const members = team.members ?? [];
                                    const teamGrade = getTeamGrade(team);

                                    return (
                                        <li key={team.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSelectTeam(team.id)
                                                }
                                                className={`w-full flex items-center gap-2.5 px-2 py-3 text-left transition rounded-lg ${
                                                    isSelected
                                                        ? "bg-indigo-50 ring-1 ring-indigo-200"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        DOT_COLORS[
                                                            index %
                                                                DOT_COLORS.length
                                                        ]
                                                    }`}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-gray-800 truncate">
                                                        {team.name}
                                                    </span>
                                                    <span className="block text-xs text-gray-400 mt-0.5">
                                                        └ {members.length}{" "}
                                                        integrante
                                                        {members.length === 1
                                                            ? ""
                                                            : "s"}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`text-sm font-bold shrink-0 ${
                                                        isSelected
                                                            ? "text-indigo-700"
                                                            : "text-gray-700"
                                                    }`}
                                                >
                                                    {formatScore(teamGrade)}
                                                    <span className="text-gray-400 font-normal">
                                                        /{maxScore}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    {gradedTeams.length > 0 && (
                        <div>
                            <p className="px-2 mb-1 text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                                Calificados ({gradedTeams.length})
                            </p>
                            <ul className="divide-y divide-gray-100">
                                {gradedTeams.map((team, index) => {
                                    const isSelected =
                                        String(selectedTeamId) ===
                                        String(team.id);
                                    const members = team.members ?? [];
                                    const teamGrade = getTeamGrade(team);

                                    return (
                                        <li key={team.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleSelectTeam(team.id)
                                                }
                                                className={`w-full flex items-center gap-2.5 px-2 py-3 text-left transition rounded-lg ${
                                                    isSelected
                                                        ? "bg-indigo-50 ring-1 ring-indigo-200"
                                                        : "hover:bg-gray-50"
                                                }`}
                                            >
                                                <span
                                                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                                        DOT_COLORS[
                                                            index %
                                                                DOT_COLORS.length
                                                        ]
                                                    }`}
                                                />
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-sm font-semibold text-gray-800 truncate">
                                                        {team.name}
                                                    </span>
                                                    <span className="block text-xs text-gray-400 mt-0.5">
                                                        └ {members.length}{" "}
                                                        integrante
                                                        {members.length === 1
                                                            ? ""
                                                            : "s"}
                                                    </span>
                                                </span>
                                                <span
                                                    className={`text-sm font-bold shrink-0 ${
                                                        isSelected
                                                            ? "text-indigo-700"
                                                            : "text-gray-700"
                                                    }`}
                                                >
                                                    {formatScore(teamGrade)}
                                                    <span className="text-gray-400 font-normal">
                                                        /{maxScore}
                                                    </span>
                                                </span>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};