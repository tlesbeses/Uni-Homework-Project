import { api, queryApi } from "@/lib/axios";

export const getAdminUsers = async (params) => {
    const { signal, search, role, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (search) {
        query.search = search;
    }
    if (role) {
        query.role = role;
    }
    const response = await queryApi.get("/auth/admin/users/", {
        params: query,
        signal,
    });
    return response.data;
};

export const setUserActive = async (userId, isActive) => {
    const response = await api.patch(
        `/auth/admin/users/${userId}/`,
        { is_active: isActive }
    );
    return response.data;
};

export const setUserRole = async (userId, role) => {
    const response = await api.patch(
        `/auth/admin/users/${userId}/`,
        { role }
    );
    return response.data;
};

export const resetUserPassword = async (userId, newPassword) => {
    const response = await api.post(
        `/auth/admin/users/${userId}/reset-password/`,
        { new_password: newPassword }
    );
    return response.data;
};

export const getActivityLogs = async (params) => {
    const { signal, action, entityType, userId, from, to, page, pageSize, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (action) {
        query.action = action;
    }
    if (entityType) {
        query.entity_type = entityType;
    }
    if (userId) {
        query.user_id = userId;
    }
    if (from) {
        query.from = from;
    }
    if (to) {
        query.to = to;
    }
    if (page) {
        query.page = page;
    }
    if (pageSize) {
        query.page_size = pageSize;
    }
    const response = await queryApi.get("/auth/admin/activity/", {
        params: query,
        signal,
    });
    return response.data;
};

export const getLoginStats = async (params) => {
    const { signal, days = 7 } = params ?? {};
    const response = await queryApi.get("/auth/admin/login-stats/", {
        params: { days },
        signal,
    });
    return response.data;
};

/** Extrae el nombre de archivo de un header Content-Disposition. */
function filenameFromDisposition(header) {
    if (!header) {
        return null;
    }
    const match = /filename="([^"]+)"/.exec(header);
    return match ? match[1] : null;
}

/** Dispara la descarga de un blob con un anchor temporal. */
function triggerBlobDownload(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

/**
 * Descarga el historial de EventLog completo (sin paginar) como CSV o JSON.
 *
 * No sirve un simple `<a href>`: la API exige el header Authorization, así
 * que el archivo se trae como blob (queryApi, sin cache GET) y se dispara la
 * descarga en el cliente. Mismos filtros que la tabla de actividad; sin
 * `action` el backend excluye los logins, como en el listado (ver DATOS.md).
 * Con `includeLogins` se incluyen también los logins (exportación "todo").
 */
export const exportActivityLogs = async (params) => {
    const {
        fileFormat = "csv",
        action,
        entityType,
        userId,
        from,
        to,
        includeLogins = false,
    } = params ?? {};
    const query = { file_format: fileFormat };
    if (action) {
        query.action = action;
    }
    if (entityType) {
        query.entity_type = entityType;
    }
    if (userId) {
        query.user_id = userId;
    }
    if (from) {
        query.from = from;
    }
    if (to) {
        query.to = to;
    }
    if (includeLogins) {
        query.include_logins = "true";
    }

    const response = await queryApi.get("/auth/admin/export-events/", {
        params: query,
        responseType: "blob",
    });

    const filename =
        filenameFromDisposition(response.headers?.["content-disposition"]) ??
        `eventlog.${fileFormat}`;
    triggerBlobDownload(response.data, filename);
    return response.data;
};

export const getErrorLogs = async (params) => {
    const { signal, source, page, pageSize, ...queryParams } = params ?? {};
    const query = { ...queryParams };
    if (source) {
        query.source = source;
    }
    if (page) {
        query.page = page;
    }
    if (pageSize) {
        query.page_size = pageSize;
    }
    const response = await queryApi.get("/api/errors/", {
        params: query,
        signal,
    });
    return response.data;
};

export const getErrorLog = async (errorId, opts) => {
    const response = await queryApi.get(`/api/errors/${errorId}/`, {
        signal: opts?.signal,
    });
    return response.data;
};

export const testEmail = async (toEmail = "") => {
    const response = await api.post(
        "/auth/admin/test-email/",
        toEmail ? { to: toEmail } : {}
    );
    return response.data;
};