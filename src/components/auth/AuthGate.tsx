import { PropsWithChildren, useCallback, useMemo, useState, useEffect, FormEvent } from "react";
import { getCurrentUser, signIn, signOut } from "aws-amplify/auth";
import { ShieldCheck, LogIn, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthContext, AuthContextValue } from "@/hooks/useAuth";

const AuthGate = ({ children }: PropsWithChildren) => {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [userEmail, setUserEmail] = useState<string>();
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hydrateSession = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUserEmail(currentUser?.signInDetails?.loginId ?? currentUser.username);
      setStatus("signedIn");
    } catch {
      setStatus("signedOut");
    }
  }, []);

  useEffect(() => {
    hydrateSession();
  }, [hydrateSession]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const { isSignedIn, nextStep } = await signIn({
        username: credentials.email.trim(),
        password: credentials.password,
      });

      if (isSignedIn) {
        await hydrateSession();
      } else {
        setStatus("signedOut");
        setError(
          nextStep?.signInStep
            ? `Action requise: ${nextStep.signInStep.replace(/_/g, " ").toLowerCase()}`
            : "Connexion incomplète, vérifiez les étapes supplémentaires."
        );
      }
    } catch (authError) {
      const message =
        authError instanceof Error ? authError.message : "Impossible de se connecter pour le moment.";
      setError(message);
      setStatus("signedOut");
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } finally {
      setStatus("signedOut");
      setUserEmail(undefined);
    }
  }, []);

  const contextValue: AuthContextValue = useMemo(
    () => ({
      status,
      userEmail,
      signOut: handleSignOut,
    }),
    [status, userEmail, handleSignOut]
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Vérification de la session...</span>
        </div>
      </div>
    );
  }

  if (status !== "signedIn") {
    return (
      <AuthContext.Provider value={contextValue}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-lg w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/60 border border-border/50">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="text-sm text-muted-foreground">Connexion requise</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-foreground">
                Espace sécurisé FleetTrack
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                Authentifiez-vous avec Cognito pour accéder au tableau de bord et verrouiller les données de suivi.
              </p>
            </div>

            <Card className="glass-card border-primary/30 shadow-glow">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="h-5 w-5 text-primary" />
                  Se connecter
                </CardTitle>
                <CardDescription>Identifiez-vous avec votre adresse e-mail et votre mot de passe.</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="space-y-4" onSubmit={handleSubmit}>
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse e-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={credentials.email}
                      onChange={(event) =>
                        setCredentials((prev) => ({ ...prev, email: event.target.value }))
                      }
                      placeholder="exemple@domaine.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe</Label>
                    <Input
                      id="password"
                      type="password"
                      required
                      value={credentials.password}
                      onChange={(event) =>
                        setCredentials((prev) => ({ ...prev, password: event.target.value }))
                      }
                      placeholder="••••••••"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button type="submit" className="w-full" disabled={pending}>
                    {pending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Connexion...
                      </>
                    ) : (
                      "Se connecter"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
};

export default AuthGate;
