import type { StatoLavorazioneConfig } from "@/lib/lavorazioni/types";
import type { LavorazioneListRow } from "@/src/services/lavorazioni.service";
import type { LavorazioneSchedeStore } from "@/types/schede";

export type KanbanMobileSection = {
  id: string;
  col: StatoLavorazioneConfig;
  items: readonly LavorazioneListRow[];
  onOpen: (row: LavorazioneListRow) => void;
};

export type KanbanCardMobileProps = {
  row: LavorazioneListRow;
  schedeStore: LavorazioneSchedeStore;
  prioritaColors: Record<string, string | undefined>;
  addettoColors: Record<string, string | undefined>;
  flash: boolean;
  onOpen: () => void;
  macchina: string;
  cliente: string;
  identSummary: string | null;
  addetto: string;
};
