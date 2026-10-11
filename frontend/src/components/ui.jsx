// Small shared building blocks
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { percent } from "../format";


// Loads data from the API. Returns { data, error, loading, reload }
export function useApi(path) {
    const [state, setState] = useState({ data: null, error: null, loading: true });
    const [version, setVersion] = useState(0);

    useEffect(() => {
        if (!path) return;

        let cancelled = false;
        setState(s => ({ ...s, loading: true, error: null }));

        api(path)
            .then(data => !cancelled && setState({ data, error: null, loading: false }))
            .catch(error => !cancelled && setState({ data: null, error: error.message, loading: false }));

        return () => {
            cancelled = true;
        };
    }, [path, version]);

    const reload = useCallback(() => setVersion(v => v + 1), []);

    return { ...state, reload };
}


export function PageHeader({ title, subtitle, children }) {
    return (
        <header className="page-header">
            <div>
                <h1>{title}</h1>
                {subtitle && <p className="page-subtitle">{subtitle}</p>}
            </div>
            {children && <div className="page-actions">{children}</div>}
        </header>
    );
}


// Shows loading / error, then children(data)
export function Loader({ state, children }) {
    if (state.loading && !state.data) {
        return <p className="muted" role="status">Chargement…</p>;
    }

    if (state.error) {
        return (
            <div className="alert alert-error" role="alert">
                {state.error}
                <button className="btn btn-small" onClick={state.reload}>Réessayer</button>
            </div>
        );
    }

    return state.data ? children(state.data) : null;
}


export function Empty({ children }) {
    return <p className="empty">{children}</p>;
}


// Present / absent share as a bar
export function PresenceBar({ present = 0, absent = 0 }) {
    const total = present + absent;
    const share = total ? (present / total) * 100 : 0;

    return (
        <div className="presence-bar" aria-hidden="true">
            <span style={{ width: `${share}%` }} />
        </div>
    );
}


export function PresenceSummary({ title, stats }) {
    return (
        <section className="panel presence-summary">
            <h2>{title}</h2>
            <p className="big-rate">{percent(stats.rate)}</p>
            <PresenceBar present={stats.present} absent={stats.absent} />
            <p className="presence-legend">
                <span className="dot dot-present" /> {stats.present} présence{stats.present > 1 ? "s" : ""}
                <span className="dot dot-absent" /> {stats.absent} absence{stats.absent > 1 ? "s" : ""}
            </p>
        </section>
    );
}


export function StatusPill({ status }) {
    const labels = { present: "Présent", absent: "Absent", pending: "En attente" };
    return <span className={`pill pill-${status}`}>{labels[status] || status}</span>;
}


export function Modal({ title, onClose, children, wide = false }) {
    const ref = useRef(null);

    useEffect(() => {
        const onKey = event => event.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        ref.current?.querySelector("input, select, textarea, button")?.focus();
        return () => document.removeEventListener("keydown", onKey);
    }, [onClose]);

    return (
        <div className="modal-backdrop" onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
                <div className="modal-head">
                    <h2>{title}</h2>
                    <button className="icon-btn" onClick={onClose} aria-label="Fermer">×</button>
                </div>
                {children}
            </div>
        </div>
    );
}


export function Field({ label, hint, children }) {
    return (
        <label className="field">
            <span className="field-label">{label}</span>
            {children}
            {hint && <span className="field-hint">{hint}</span>}
        </label>
    );
}


// ---------- Toast messages ----------

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    const show = useCallback((message, tone = "success") => {
        setToast({ message, tone, id: Date.now() });
    }, []);

    useEffect(() => {
        if (!toast) return;
        const timer = setTimeout(() => setToast(null), 3500);
        return () => clearTimeout(timer);
    }, [toast]);

    return (
        <ToastContext.Provider value={show}>
            {children}
            <div className="toast-zone" role="status" aria-live="polite">
                {toast && <div key={toast.id} className={`toast toast-${toast.tone}`}>{toast.message}</div>}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    return useContext(ToastContext);
}


// Runs an API action with a busy flag and a toast for the result
export function useAction() {
    const toast = useToast();
    const [busy, setBusy] = useState(false);

    const run = async (action, successMessage) => {
        setBusy(true);
        try {
            const result = await action();
            if (successMessage !== false) toast(successMessage || result?.message || "Enregistré");
            return result;
        } catch (error) {
            toast(error.message, "error");
            throw error;
        } finally {
            setBusy(false);
        }
    };

    return [run, busy];
}
