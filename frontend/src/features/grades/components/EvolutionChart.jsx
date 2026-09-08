import { useMemo } from "react";
import {
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

const formatShortDate = (iso) =>
    new Date(iso).toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "2-digit",
    });

export const EvolutionChart = ({ points }) => {
    const data = useMemo(
        () =>
            points.map((point, index) => ({
                index,
                label: formatShortDate(point.created_at),
                value: Number(point.score ?? 0),
            })),
        [points]
    );

    if (data.length === 0) {
        return (
            <p className="text-xs text-gray-500 py-4 text-center">
                Aún no hay historial de evolución para este curso.
            </p>
        );
    }

    return (
        <div className="py-3">
            <ResponsiveContainer width="100%" height={200}>
                <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                        dataKey="label"
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 11, fill: "#6b7280" }}
                        tickLine={false}
                        width={36}
                    />
                    <Tooltip
                        formatter={(value) => [`${value}%`, "Nota final"]}
                        labelFormatter={(label) => `Fecha: ${label}`}
                    />
                    <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#4f46e5"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#4f46e5" }}
                        activeDot={{ r: 6 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};