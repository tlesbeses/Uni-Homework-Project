const STYLES = {
    published: "bg-green-100 text-green-800",
    draft: "bg-yellow-100 text-yellow-800",
};

const LABELS = {
    published: "Publicada",
    draft: "Borrador",
};

export const PublishBadge = ({ published }) => (
    <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            published ? STYLES.published : STYLES.draft
        }`}
    >
        {published ? LABELS.published : LABELS.draft}
    </span>
);
