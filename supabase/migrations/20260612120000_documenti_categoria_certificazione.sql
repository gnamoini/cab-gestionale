-- Aggiunge categoria documento «certificazione» (UI: Certificazioni).
alter type public.categoria_documento add value if not exists 'certificazione';
