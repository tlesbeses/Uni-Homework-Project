import api from "../../../api/axios";


export const login = async (username, password) => {
    const response = await api.post(
        "auth/jwt/create/",
        {
            username,
            password,
        }
    );

    return response.data;
};


export const register = async (userData) => {
    const response = await api.post(
        "auth/users/",
        userData
    );

    return response.data;
};