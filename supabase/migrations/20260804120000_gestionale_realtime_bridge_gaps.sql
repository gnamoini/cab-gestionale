-- Bridge ↔ publication parity: tabelle sottoscritte dal client ma assenti da supabase_realtime.

do $$
begin
  alter publication supabase_realtime add table public.ordini_fornitori;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ordini_fornitori_righe;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.inventory_documents;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.inventory_document_lines;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.invoices;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.invoice_payments;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.ddt_documents;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.pdf_artifacts;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.document_access_tokens;
exception when duplicate_object then null;
end $$;
