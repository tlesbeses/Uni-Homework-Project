const ToggleRow = ({
  title,
  description,
  badgeLabel,
  badgeClassName,
  checked,
  disabled,
  onChange,
}) => (
  <div className="p-6 flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
      <p className="text-sm text-gray-500">{description}</p>
    </div>
    <div className="flex items-center gap-3 shrink-0">
      {badgeLabel && (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${badgeClassName}`}
        >
          {badgeLabel}
        </span>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition disabled:opacity-50 ${
          checked ? "bg-indigo-600" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition ${
            checked ? "left-6" : "left-1"
          }`}
        />
      </button>
    </div>
  </div>
);

export const QuickSettingsBar = ({
  course,
  savingField,
  onToggleAutoAccept,
  onToggleVisibility,
}) => {
  const autoAccept = Boolean(course.settings?.auto_accept_students);
  const isPublic = course.visibility === "PUBLIC";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-100">
      <ToggleRow
        title="Aceptación automática"
        description="Aprobar automáticamente las solicitudes de inscripción."
        badgeLabel={autoAccept ? "Automática" : "Manual"}
        badgeClassName={
          autoAccept
            ? "bg-green-100 text-green-800"
            : "bg-gray-100 text-gray-600"
        }
        checked={autoAccept}
        disabled={savingField === "auto_accept"}
        onChange={onToggleAutoAccept}
      />
      <ToggleRow
        title="Visibilidad del curso"
        description={
          isPublic
            ? "Los estudiantes pueden encontrarlo e inscribirse por su cuenta."
            : "Los estudiantes solo pueden unirse con el código de invitación."
        }
        badgeLabel={isPublic ? "Público" : "Privado"}
        badgeClassName={
          isPublic ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
        }
        checked={isPublic}
        disabled={savingField === "visibility"}
        onChange={onToggleVisibility}
      />
    </div>
  );
};
