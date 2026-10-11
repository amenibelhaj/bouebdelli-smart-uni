import Timetable from "../components/Timetable";
import { Loader, PageHeader, useApi } from "../components/ui";


export default function TimetablePage({ mode }) {
    const state = useApi("/schedules/my");

    return (
        <>
            <PageHeader
                title="Emploi du temps"
                subtitle={mode === "teacher"
                    ? "Vos cours de la semaine. Ajoutez une note sous une matière pour prévenir le groupe."
                    : "Vos cours de la semaine, avec les notes de vos enseignants."}
            />
            <Loader state={state}>
                {schedules => <Timetable schedules={schedules} mode={mode} onChanged={state.reload} />}
            </Loader>
        </>
    );
}
