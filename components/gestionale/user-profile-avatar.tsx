/** Iniziale per avatar profilo (nome, altrimenti email). */
export function userProfileInitial(nome?: string | null, email?: string | null): string {
  return (nome?.trim()?.charAt(0) ?? email?.trim()?.charAt(0) ?? "?").toUpperCase();
}

const profileAvatarInitialClass =
  "flex min-w-0 h-full w-full items-center justify-center font-bold text-white";

/** Stesso token del nome in welcome (`text-[color:var(--cab-primary)]`). */
const variantShell = {
  header: "flex min-w-0 h-8 w-8 shrink-0 rounded-full bg-[color:var(--cab-primary)]",
  sidebar: "flex min-w-0 h-9 w-9 shrink-0 rounded-lg bg-[color:var(--cab-primary)]",
  /** Avatar rail sidebar — allineato a `.cab-sidebar-nav-icon`, stesso arancione/bianco. */
  rail: "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[color:var(--cab-primary)]",
} as const;

const variantInitial = {
  header: `${profileAvatarInitialClass} text-[11px]`,
  sidebar: `${profileAvatarInitialClass} text-xs`,
  rail: `${profileAvatarInitialClass} text-[11px] leading-none`,
} as const;

type UserProfileAvatarProps = {
  nome?: string | null;
  email?: string | null;
  variant?: keyof typeof variantShell;
  className?: string;
};

/** Avatar iniziali utente — sfondo `--cab-primary`, testo bianco (coerente ovunque). */
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
