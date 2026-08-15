const STYLES = {
    individual: "bg-purple-100 text-purple-800",
    team: "bg-gray-100 text-gray-700",
};

const LABELS = {
    individual: "Individual",
    team: "Grupal",
};

export const GradeOriginBadge = ({ isIndividual }) => (
    <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            isIndividual ? STYLES.individual : STYLES.team
        }`}
    >
        {isIndividual ? LABELS.individual : LABELS.team}
    </span>
);
