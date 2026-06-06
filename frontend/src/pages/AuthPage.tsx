import { useState } from "react";
import { apiClient } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";
import type { RegisterResponse } from "../types";

export function AuthPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState(
    () => localStorage.getItem("lastUsername") ?? "",
  );
  const [token, setToken] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredData, setRegisteredData] = useState<RegisterResponse | null>(
    null,
  );
  const [copied, setCopied] = useState(false);
  const [registering, setRegistering] = useState(false);

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await apiClient.login({ username, token });
      login(res.player_id, res.username);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setErr("");
    setRegistering(true);
    try {
      const res = await apiClient.register();
      setRegisteredData(res);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setRegistering(false);
    }
  };

  const handleContinue = () => {
    if (!registeredData) return;
    login(registeredData.player_id, registeredData.username);
    setRegisteredData(null);
  };

  return (
    <>
      <div className="max-w-sm mx-auto mt-24 p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">rpso</h1>

        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
          />

          <Input
            placeholder="Token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />

          {err && <p className="text-red-400 text-sm">{err}</p>}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "..." : "Login"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            className="w-full"
            onClick={handleRegister}
            disabled={registering}
          >
            {registering ? "Registering…" : "Register new user"}
          </Button>
        </form>
      </div>

      {registeredData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h2 className="text-xl font-bold">Account created!</h2>

            <p className="text-sm text-neutral-400">
              Your username is{" "}
              <span className="font-semibold text-white">
                {registeredData.username}
              </span>
              .
            </p>

            <p className="text-sm text-neutral-400">
              A login token has been generated. Save it in a safe place.
            </p>

            <div
              className="relative bg-neutral-800 rounded p-3 font-mono text-sm select-all overflow-hidden"
              onClick={() => handleCopy(registeredData.token)}
            >
              <span className="invisible" aria-hidden="true">
                •
              </span>
              <div className="absolute inset-y-3 left-3 right-3 whitespace-nowrap overflow-hidden after:content-['••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••']"></div>
            </div>

            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => handleCopy(registeredData.token)}
            >
              {copied ? "Copied!" : "Copy token"}
            </Button>

            <Button type="button" className="w-full" onClick={handleContinue}>
              Continue
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
