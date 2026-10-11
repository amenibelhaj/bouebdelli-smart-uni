import { useEffect } from "react";
import { api } from "./api";
import { useAuth } from "./auth";
import { navigate, useRoute } from "./router";
import Layout from "./components/Layout";
import { Empty, PageHeader } from "./components/ui";

import Login from "./pages/Login";
import TimetablePage from "./pages/TimetablePage";
import AccountPage from "./pages/AccountPage";
import DoorBox from "./pages/DoorBox";
import MyFace from "./pages/MyFace";

import StudentHome from "./pages/student/StudentHome";
import StudentAbsences from "./pages/student/StudentAbsences";

import { TeacherAttendance, TeacherHome, TeacherNotes } from "./pages/teacher/TeacherPages";

import AdminHome from "./pages/admin/AdminHome";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSchedules from "./pages/admin/AdminSchedules";
import AdminAttendance from "./pages/admin/AdminAttendance";
import AdminCrud, { CRUD_PAGES } from "./pages/admin/AdminCrud";


const ROUTES = {
    student: {
        "/": () => <StudentHome />,
        "/emploi-du-temps": () => <TimetablePage mode="student" />,
        "/absences": () => <StudentAbsences />,
        "/mon-visage": () => <MyFace />
    },
    teacher: {
        "/": () => <TeacherHome />,
        "/emploi-du-temps": () => <TimetablePage mode="teacher" />,
        "/presences": () => <TeacherAttendance />,
        "/notes": () => <TeacherNotes />,
        "/mon-visage": () => <MyFace />
    },
    admin: {
        "/": () => <AdminHome />,
        "/utilisateurs": () => <AdminUsers />,
        "/emploi-du-temps": () => <AdminSchedules />,
        "/presences": () => <AdminAttendance />,
        ...Object.fromEntries(Object.keys(CRUD_PAGES).map(page => [`/${page}`, () => <AdminCrud key={page} page={page} />]))
    }
};


function NotFound() {
    return (
        <>
            <PageHeader title="Page introuvable" />
            <Empty>Cette page n'existe pas. <a href="#/" className="text-link">Retour à l'accueil</a></Empty>
        </>
    );
}


export default function App() {
    const { user } = useAuth();
    const path = useRoute();

    // First login of a student / teacher without a registered face:
    // send them once to the "Mon visage" page
    useEffect(() => {
        if (!user || !["student", "teacher"].includes(user.role)) return;

        const flag = `smartuni_face_checked_${user.id}`;
        try {
            if (sessionStorage.getItem(flag)) return;
            sessionStorage.setItem(flag, "1");
        } catch { /* ignore */ }

        api("/auth/face")
            .then(status => {
                if (status.available && status.photos === 0) navigate("/mon-visage");
            })
            .catch(() => {});
    }, [user]);

    // The door camera page works without logging in (the box uses its own key)
    if (path === "/boitier") {
        return <DoorBox />;
    }

    if (!user) {
        return <Login />;
    }

    const page = path === "/compte"
        ? () => <AccountPage />
        : (ROUTES[user.role] || {})[path] || NotFound;

    return (
        <Layout path={path}>
            {page()}
        </Layout>
    );
}
