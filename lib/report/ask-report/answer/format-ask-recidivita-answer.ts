import type { AskRecidivitaToolData } from "@/lib/report/ask-report/recidivita/load-ask-recidivita.server";

export function formatAskRecidivitaAnswer(data: AskRecidivitaToolData): string {
  const windowLabel = `${data.windowDays} giorni`;
  const lines: string[] = [
    `Analisi recidività (finestra ${windowLabel}, periodo ${data.periodLabel}).`,
  ];

  if (data.dataWarnings.length) {
    lines.push(data.dataWarnings.join(" "));
  }

  if (data.subject === "fleet" && data.fleetSummary) {
    const f = data.fleetSummary;
    lines.push(
      `Flotta: ${f.mezziAnalizzati} mezzi analizzati, ${f.ingressiTotali} ingressi, ${f.ritorniWindow} ritorni entro ${windowLabel}, indice recidività ${f.indiceRecidivitaPct}%.`,
    );
    return lines.join("\n");
  }

  if (data.subject === "mezzo" && data.mezzi?.length) {
    const top = data.mezzi[0]!;
    lines.push(
      `Mezzo con più ritorni: ${top.mezzo} (${top.cliente}) — ${top.ritorni} ritorni su ${top.interventi} interventi, score ${top.recidivitaScorePct}%.`,
    );
    if (data.mezzi.length > 1) {
      lines.push("Altri mezzi critici:");
      for (const m of data.mezzi.slice(1, 4)) {
        lines.push(`• ${m.mezzo}: ${m.ritorni} ritorni / ${m.interventi} interventi`);
      }
    }
    return lines.join("\n");
  }

  if (data.subject === "operatore" && data.operatori?.length) {
    const top = data.operatori[0]!;
    if (data.rankBy === "mezzi_con_ritorno") {
      lines.push(
        `Addetto con più mezzi con ritorno: ${top.operatore} — ${top.mezziConRitorno} mezzi distinti con ritorno, ${top.ritorni} episodi di ritorno su ${top.interventi} interventi (${top.returnRatePct}% tasso).`,
      );
    } else if (data.rankBy === "risk_index") {
      lines.push(
        `Addetto con indice rischio più alto: ${top.operatore} — indice ${top.riskIndex}, ${top.ritorni} ritorni su ${top.interventi} interventi (${top.returnRatePct}%).`,
      );
    } else {
      lines.push(
        `Addetto con più ritorni: ${top.operatore} — ${top.ritorni} ritorni su ${top.interventi} interventi (${top.returnRatePct}% tasso).`,
      );
    }
    lines.push(
      "Nota: indicatore esplorativo su interventi attribuiti — non è una valutazione individuale di performance.",
    );
    if (data.operatori.length > 1) {
      lines.push("Classifica:");
      for (const o of data.operatori.slice(0, 5)) {
        const extra =
          data.rankBy === "mezzi_con_ritorno"
            ? `${o.mezziConRitorno} mezzi`
            : `${o.ritorni} ritorni`;
        lines.push(`• ${o.operatore}: ${extra} (${o.returnRatePct}%)`);
      }
    }
    return lines.join("\n");
  }

  return `${lines.join("\n")}\nDati insufficienti nel periodo (minimo 3 interventi per operatore). Prova ad ampliare il periodo o la finestra recidività.`;
}
