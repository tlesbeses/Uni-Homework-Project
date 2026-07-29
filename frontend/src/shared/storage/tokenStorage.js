const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";

export const tokenStorage = {
    getAccessToken: () => localStorage.getItem(ACCESS_TOKEN_KEY),

    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

    setAccessToken: (token) =>
        localStorage.setItem(ACCESS_TOKEN_KEY, token),

    setRefreshToken: (token) =>
        localStorage.setItem(REFRESH_TOKEN_KEY, token),

    clear() {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
};

export const userStorage = {
    getUser: () => {
        const user = localStorage.getItem("user");
        return user ? JSON.parse(user) : null;
    },

    clear() {
        localStorage.removeItem("user");
    }
}