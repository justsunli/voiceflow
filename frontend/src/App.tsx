import { useEffect, useMemo, useState } from "react";

type User = {
  id: number;
  email: string;
  name: string;
};

type MeResponse = {
  authenticated: boolean;
  user: User | null;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

function getCookie(name: string): string | null {
  const cookies = document.cookie.split(";").map((entry) => entry.trim());
  const cookie = cookies.find((entry) => entry.startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.split("=")[1]) : null;
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<MeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const googleLoginUrl = useMemo(
    () => `${API_BASE_URL}/accounts/google/login/?process=login`,
    [],
  );

  async function fetchMe() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE_URL}/api/auth/me/`, {
        method: "GET",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`Auth status request failed (${response.status})`);
      }
      const data = (await response.json()) as MeResponse;
      setMe(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
      setMe({ authenticated: false, user: null });
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      const csrfToken = getCookie("csrftoken");
      const response = await fetch(`${API_BASE_URL}/api/auth/logout/`, {
        method: "POST",
        credentials: "include",
        headers: csrfToken ? { "X-CSRFToken": csrfToken } : {},
      });
      if (!response.ok) {
        throw new Error(`Logout failed (${response.status})`);
      }
      await fetchMe();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unexpected error";
      setError(message);
    }
  }

  useEffect(() => {
    fetchMe();
  }, []);

  if (loading) {
    return <main className="container">Checking auth status...</main>;
  }

  if (error) {
    return (
      <main className="container">
        <h1>Voiceflow</h1>
        <p className="error">{error}</p>
        <button onClick={fetchMe}>Retry</button>
      </main>
    );
  }

  if (!me?.authenticated || !me.user) {
    return (
      <main className="container">
        <h1>Voiceflow</h1>
        <p>Sign in with Google to continue.</p>
        <a className="button-link" href={googleLoginUrl}>
          Continue with Google
        </a>
      </main>
    );
  }

  return (
    <main className="container">
      <h1>Voiceflow</h1>
      <p>Welcome, {me.user.name}</p>
      <p className="muted">{me.user.email}</p>
      <p className="status-ok">Phase 1 complete: authenticated home page.</p>
      <button onClick={handleLogout}>Log out</button>
    </main>
  );
}
