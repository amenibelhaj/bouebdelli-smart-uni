import { createContext, useContext, useEffect, useState } from "react";
import { api, clearSession, getToken, saveSession, savedUser, setUnauthorizedHandler } from "./api";

const AuthContext = createContext(null);


export function AuthProvider({ children }) {

    const [user, setUser] = useState(() => (getToken() ? savedUser() : null));

    const logout = () => {
        clearSession();
        setUser(null);
        window.location.hash = "#/";
    };

    useEffect(() => {
        setUnauthorizedHandler(logout);
    }, []);

    const login = async (email, password) => {
        const data = await api("/auth/login", {
            method: "POST",
            body: { email, password }
        });

        saveSession(data.token, data.user);
        setUser(data.user);
        window.location.hash = "#/";
    };

    return (
        <AuthContext.Provider value={{ user, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}


export function useAuth() {
    return useContext(AuthContext);
}
