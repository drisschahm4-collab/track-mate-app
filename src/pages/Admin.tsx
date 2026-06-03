import { useState, useEffect, useCallback, FormEvent } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Loader2, LogIn, RefreshCw, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const SS_KEY = "fleettrack-admin-pw";
const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-history`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

type LoginEvent = {
  id: string;
  created_at: string;
  user_sub: string | null;
  username: string | null;
  email: string | null;
  user_agent: string | null;
};

type PrivacyEvent = {
  timestamp: number;
  plugin_id: string;
  plugin_label: string;
  device_id?: number;
  device_name?: string;
  device_ident?: string;
  action: "ON" | "OFF";
  raw_event: string;
  actor_sub?: string;
  actor_email?: string;
  actor_username?: string;
  actor_ip?: string;
  actor_user_agent?: string;
  source?: string;
};

type ActiveSession = {
  device_id?: number;
  device_name?: string;
  device_ident?: string;
  since: number;
  actor_email?: string;
  actor_username?: string;
  actor_sub?: string;
};

const callAdmin = async <T,>(password: string, type: "verify" | "logins" | "privacy"): Promise<T> => {
  const res = await fetch(FN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
    },
    body: JSON.stringify({ password, type, limit: 300 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || "Erreur serveur");
  return data as T;
};

const fmtDate = (iso: string | number) => {
  const d = typeof iso === "number" ? new Date(iso * 1000) : new Date(iso);
  return d.toLocaleString("fr-FR");
};

const fmtDuration = (sinceSec: number) => {
  const diffMs = Date.now() - sinceSec * 1000;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return `${h}h ${m}min`;
  const d = Math.floor(h / 24);
  return `${d}j ${h % 24}h`;
};

const Admin = () => {
  const [password, setPassword] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logins, setLogins] = useState<LoginEvent[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(false);
  const [loadingPrivacy, setLoadingPrivacy] = useState(false);

  const loadAll = useCallback(async (pw: string) => {
    setLoadingLogins(true);
    setLoadingPrivacy(true);
    try {
      const [l, p] = await Promise.all([
        callAdmin<{ items: LoginEvent[] }>(pw, "logins"),
        callAdmin<{ items: PrivacyEvent[]; activeSessions?: ActiveSession[] }>(pw, "privacy"),
      ]);
      setLogins(l.items || []);
      setPrivacy(p.items || []);
      setActiveSessions(p.activeSessions || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setLoadingLogins(false);
      setLoadingPrivacy(false);
    }
  }, []);

  // Auto-restore from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(SS_KEY);
    if (stored) {
      callAdmin(stored, "verify")
        .then(() => {
          setPassword(stored);
          setAuthed(true);
          loadAll(stored);
        })
        .catch(() => sessionStorage.removeItem(SS_KEY));
    }
  }, [loadAll]);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await callAdmin(password, "verify");
      sessionStorage.setItem(SS_KEY, password);
      setAuthed(true);
      await loadAll(password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setPending(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem(SS_KEY);
    setAuthed(false);
    setPassword("");
    setLogins([]);
    setPrivacy([]);
  };

  if (!authed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50">
              <ShieldCheck className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">Accès admin</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">Console administrateur</h1>
          </div>

          <Card className="glass-card border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5 text-primary" />
                Authentification
              </CardTitle>
              <CardDescription>Entrez le mot de passe administrateur.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw">Mot de passe</Label>
                  <Input
                    id="pw"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Accéder
                </Button>
                <Button asChild type="button" variant="ghost" className="w-full">
                  <Link to="/">
                    <ArrowLeft className="h-4 w-4 mr-2" /> Retour
                  </Link>
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="glass-card p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/20">
              <ShieldCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="font-display font-bold text-lg">Console administrateur</h1>
              <p className="text-sm text-muted-foreground">Historique des connexions et du mode vie privée</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => loadAll(password)}>
              <RefreshCw className="h-4 w-4 mr-2" /> Rafraîchir
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" /> Dashboard
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Déconnexion
            </Button>
          </div>
        </header>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="logins" className="w-full">
          <TabsList>
            <TabsTrigger value="logins">Connexions ({logins.length})</TabsTrigger>
            <TabsTrigger value="privacy">Vie privée ({privacy.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="logins">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Historique des connexions</CardTitle>
                <CardDescription>Enregistré à chaque login réussi.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingLogins ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...
                  </div>
                ) : logins.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">Aucune connexion enregistrée.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Utilisateur</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="hidden md:table-cell">Navigateur</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {logins.map((l) => (
                          <TableRow key={l.id}>
                            <TableCell className="whitespace-nowrap text-xs">{fmtDate(l.created_at)}</TableCell>
                            <TableCell className="font-medium">{l.username || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{l.email || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[300px]">
                              {l.user_agent || "—"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="privacy">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Historique du mode vie privée</CardTitle>
                <CardDescription>
                  Activations / désactivations vues côté Flespi (assignations aux plugins).
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPrivacy ? (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /> Chargement...
                  </div>
                ) : privacy.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    Aucun évènement disponible dans la rétention Flespi.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Plugin</TableHead>
                          <TableHead>Véhicule</TableHead>
                          <TableHead className="hidden md:table-cell">IMEI</TableHead>
                          <TableHead className="hidden lg:table-cell">Évènement</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {privacy.map((p, i) => (
                          <TableRow key={`${p.plugin_id}-${p.timestamp}-${i}`}>
                            <TableCell className="whitespace-nowrap text-xs">{fmtDate(p.timestamp)}</TableCell>
                            <TableCell>
                              {p.action === "ON" ? (
                                <Badge className="bg-accent/20 text-accent border border-accent/30">
                                  <EyeOff className="h-3 w-3 mr-1" /> ON
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  <Eye className="h-3 w-3 mr-1" /> OFF
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs">{p.plugin_label}</TableCell>
                            <TableCell className="font-medium">
                              {p.device_name || p.device_id || "—"}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-xs text-muted-foreground">
                              {p.device_ident || "—"}
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                              {p.raw_event}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;
