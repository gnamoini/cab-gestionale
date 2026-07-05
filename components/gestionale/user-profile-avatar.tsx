/** Iniziale per avatar profilo (nome, altrimenti email). */
export function userProfileInitial(nome?: string | null, email?: string | null): string {
  return (nome?.trim()?.charAt(0) ?? email?.trim()?.charAt(0) ?? "?").toUpperCase();
}

const profileAvatarInitialClass =
  "flex min-w-0 h-full w-full items-center justify-center font-bold leading-none text-white";

/** Iniziale piccola — stesso token su rail, header e sidebar. */
const profileAvatarInitialSmClass = `${profileAvatarInitialClass} text-base`;

/** Iniziale profilo (h-14) — proporzionale al cerchio grande. */
const profileAvatarInitialLgClass = `${profileAvatarInitialClass} text-2xl`;

/** SSOT shell + iniziale per ogni contesto profilo. */
const variantShell = {
  header: "flex min-w-0 h-8 w-8 shrink-0 rounded-full bg-[color:var(--cab-primary)]",
  sidebar: "flex min-w-0 h-9 w-9 shrink-0 rounded-lg bg-[color:var(--cab-primary)]",
  /** Avatar rail sidebar — tondo, stesso arancione/bianco delle icone nav. */
  rail: "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color:var(--cab-primary)]",
  /** Header scheda profilo (drawer). */
  sheet: "flex min-w-0 h-14 w-14 shrink-0 rounded-full bg-[color:var(--cab-primary)]",
} as const;

const variantInitial = {
  header: profileAvatarInitialSmClass,
  sidebar: profileAvatarInitialSmClass,
  rail: profileAvatarInitialSmClass,
  sheet: profileAvatarInitialLgClass,
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
