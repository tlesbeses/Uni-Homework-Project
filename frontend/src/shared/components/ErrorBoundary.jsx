import { Component } from "react";
import { reportError } from "@/shared/utils/reportError";

export class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorId: "" };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, info) {
        const componentName = this.props.name || "ErrorBoundary";
        reportError({
            kind: error?.name || "Error",
            message: error?.message || String(error) || "Error desconocido",
            stack: [error?.stack, info?.componentStack].filter(Boolean).join("\n") || "",
            component: componentName,
        }).then((errorId) => {
            if (errorId) {
                this.setState({ errorId });
            }
        });
    }

    handleReload = () => {
        window.location.reload();
    };

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                    <h1 className="text-xl font-bold text-gray-800">
                        Algo salió mal
                    </h1>
                    <p className="mt-2 text-sm text-gray-500">
                        Ocurrió un error inesperado en la aplicación. Puedes
                        recargar la página para volver a intentarlo.
                    </p>
                    {this.state.errorId && (
                        <p className="mt-3 text-xs text-gray-400">
                            Código de soporte:{" "}
                            <span className="font-mono text-indigo-600">
                                {this.state.errorId}
                            </span>
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={this.handleReload}
                        className="mt-6 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                    >
                        Recargar página
                    </button>
                </div>
            </div>
        );
    }
}