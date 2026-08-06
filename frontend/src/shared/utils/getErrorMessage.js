
export function getErrorMessage(error) {
    if (!error.response) {
        return "Network error.";
    }

    const data = error.response.data;

    if (typeof data === "string") { return data; }
    if (data.detail) { return data.detail; }
    if (data.message) { return data.message; }

    return "An unexpected error occurred.";
}