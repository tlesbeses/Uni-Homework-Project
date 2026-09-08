import { useEffect, useMemo, useState } from "react";

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

const EMPTY_PCTS = {
  p1_acumulado_pct: "25.00",
  p1_examen_pct: "25.00",
  p2_acumulado_pct: "25.00",
  p2_examen_pct: "25.00",
};

export const QuickSettingsBar = ({
  course,
  savingField,
  onToggleAutoAccept,
  onToggleVisibility,
  onUpdatePonderacion,
}) => {
  const autoAccept = Boolean(course.settings?.auto_accept_students);
  const isPublic = course.visibility === "PUBLIC";

  const [ponderacionEnabled, setPonderacionEnabled] = useState(
    Boolean(course.settings?.ponderacion_enabled)
  );
  const [pcts, setPcts] = useState({ ...EMPTY_PCTS });

  useEffect(() => {
    setPonderacionEnabled(Boolean(course.settings?.ponderacion_enabled));
    setPcts({
      p1_acumulado_pct: course.settings?.p1_acumulado_pct ?? "25.00",
      p1_examen_pct: course.settings?.p1_examen_pct ?? "25.00",
      p2_acumulado_pct: course.settings?.p2_acumulado_pct ?? "25.00",
      p2_examen_pct: course.settings?.p2_examen_pct ?? "25.00",
    });
  }, [course.settings]);

  const sum = useMemo(
    () =>
      Object.values(pcts).reduce(
        (acc, value) => acc + (Number(value) || 0),
        0
      ),
    [pcts]
  );
  const percentagesValid = Math.abs(sum - 100) < 0.001;
  const savingPonderacion = savingField === "ponderacion";

  const handleTogglePonderacion = () => {
    const next = !ponderacionEnabled;
    setPonderacionEnabled(next);
    onUpdatePonderacion?.({ ponderacion_enabled: next });
  };

  const handleSavePercentages = () => {
    if (!percentagesValid) {
      return;
    }
    onUpdatePonderacion?.({
      p1_acumulado_pct: pcts.p1_acumulado_pct,
      p1_examen_pct: pcts.p1_examen_pct,
      p2_acumulado_pct: pcts.p2_acumulado_pct,
      p2_examen_pct: pcts.p2_examen_pct,
    });
  };

  const pctInputs = [
    { key: "p1_acumulado_pct", label: "Parcial 1 · Acumulado" },
    { key: "p1_examen_pct", label: "Parcial 1 · Exámenes" },
    { key: "p2_acumulado_pct", label: "Parcial 2 · Acumulado" },
    { key: "p2_examen_pct", label: "Parcial 2 · Exámenes" },
  ];

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
      <div className="p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Ponderación de la nota final
            </h2>
            <p className="text-sm text-gray-500">
              Divide la nota final entre acumulados y exámenes de cada parcial.
              Los cuatro porcentajes deben sumar 100.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${
                ponderacionEnabled
                  ? "bg-green-100 text-green-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {ponderacionEnabled ? "Activa" : "Desactivada"}
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={ponderacionEnabled}
              disabled={savingPonderacion}
              onClick={handleTogglePonderacion}
              className={`relative w-12 h-7 rounded-full transition disabled:opacity-50 ${
                ponderacionEnabled ? "bg-indigo-600" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition ${
                  ponderacionEnabled ? "left-6" : "left-1"
                }`}
              />
            </button>
          </div>
        </div>

        {ponderacionEnabled && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {pctInputs.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
                    {label}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={pcts[key]}
                    onChange={(e) =>
                      setPcts((prev) => ({ ...prev, [key]: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 outline-none transition text-sm text-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              ))}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p
                className={`text-sm font-medium ${
                  percentagesValid
                    ? "text-emerald-600"
                    : "text-red-600"
                }`}
              >
                Suma: {sum}% {percentagesValid ? "· Los porcentajes cuadran" : "· Debe sumar 100"}
              </p>
              <button
                type="button"
                onClick={handleSavePercentages}
                disabled={!percentagesValid || savingPonderacion}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingPonderacion ? "Guardando..." : "Guardar porcentajes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};