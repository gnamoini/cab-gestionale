const IOS_STEPS = [
  { step: "1", label: "Tocca", emphasis: "Condividi" },
  { step: "2", label: "Seleziona", emphasis: "Aggiungi a Home" },
] as const;

export function PwaIosInstallSteps() {
  return (
    <ol className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5" aria-label="Passaggi installazione iOS">
      {IOS_STEPS.map((item) => (
        <li key={item.step} className="flex items-center gap-2 text-xs text-[color:#a1a1aa]">
          <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[color:color-mix(in_srgb,#ffffff_10%,transparent)] text-[10px] font-bold text-[color:#fafafa]">
            {item.step}
          </span>
          <span>
            {item.label}{" "}
            <span className="font-semibold text-[color:#fafafa]">{item.emphasis}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}
