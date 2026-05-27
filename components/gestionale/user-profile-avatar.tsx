/** Iniziale per avatar profilo (nome, altrimenti email). */
export function userProfileInitial(nome?: string | null, email?: string | null): string {
  return (nome?.trim()?.charAt(0) ?? email?.trim()?.charAt(0) ?? "?").toUpperCase();
}

/** Stesso token del nome in welcome (`text-[color:var(--cab-primary)]`); `bg-current` = sfondo identico al `color`. */
const variantShell = {
  header: "flex h-8 w-8 shrink-0 rounded-full bg-current text-[color:var(--cab-primary)]",
  sidebar: "flex h-9 w-9 shrink-0 rounded-lg bg-current text-[color:var(--cab-primary)]",
} as const;

const variantInitial = {
  header: "flex h-full w-full items-center justify-center text-[11px] font-bold text-white",
  sidebar: "flex h-full w-full items-center justify-center text-xs font-bold text-white",
} as const;

type UserProfileAvatarProps = {
  nome?: string | null;
  email?: string | null;
  variant?: keyof typeof variantShell;
  className?: string;
};

/** Avatar iniziali utente — sfondo `--cab-primary` (stesso arancione del nome in dashboard). */
export function UserProfileAvatar({
  nome,
  email,
  variant = "header",
  className = "",
}: UserProfileAvatarProps) {
  return (
    <span className={`${variantShell[variant]} ${className}`.trim()} aria-hidden>
      <span className={variantInitial[variant]}>{userProfileInitial(nome, email)}</span>
    </span>
  );
}
