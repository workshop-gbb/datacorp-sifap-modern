"use client";
import { useActionState } from "react";
import { ArrowRight, LockKeyhole, AlertCircle } from "lucide-react";
import { login, type LoginState } from "@/app/[locale]/login/actions";
import { dictionary, type Locale } from "@/lib/i18n";
import { Button } from "./ui/button";
export function LoginForm({ locale }: { locale: Locale }) {
  const d = dictionary(locale);
  const [state, action, pending] = useActionState(login, {} as LoginState);
  return (
    <form action={action} className="login-form" aria-busy={pending}>
      <input type="hidden" name="locale" value={locale} />
      <label htmlFor="role">{d.accessType}</label>
      <select id="role" name="role" defaultValue="VIEWER" required>
        <option value="VIEWER">{d.viewerOption}</option>
        <option value="ADMIN">{d.adminOption}</option>
      </select>
      <label htmlFor="username">{d.username}</label>
      <input
        id="username"
        name="username"
        autoComplete="username"
        required
        maxLength={64}
      />
      <label htmlFor="password">{d.password}</label>
      <input
        id="password"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        maxLength={128}
      />
      {state.error && (
        <p className="form-error" role="alert">
          <AlertCircle size={18} />
          {d[state.error]}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? d.loginPending : d.signIn}
        <ArrowRight size={18} />
      </Button>
      <p className="login-help">
        <LockKeyhole size={16} />
        {d.loginHelp}
      </p>
    </form>
  );
}
