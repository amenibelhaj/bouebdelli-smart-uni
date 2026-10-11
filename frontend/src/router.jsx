// Minimal hash router: #/emploi-du-temps -> "/emploi-du-temps"
import { useEffect, useState } from "react";


function currentPath() {
    const hash = window.location.hash.replace(/^#/, "");
    return hash.split("?")[0] || "/";
}


export function useRoute() {
    const [path, setPath] = useState(currentPath);

    useEffect(() => {
        const onChange = () => {
            setPath(currentPath());
            window.scrollTo(0, 0);
        };

        window.addEventListener("hashchange", onChange);
        return () => window.removeEventListener("hashchange", onChange);
    }, []);

    return path;
}


export function navigate(path) {
    window.location.hash = "#" + path;
}


export function Link({ to, className, children, onClick }) {
    return (
        <a href={"#" + to} className={className} onClick={onClick}>
            {children}
        </a>
    );
}
