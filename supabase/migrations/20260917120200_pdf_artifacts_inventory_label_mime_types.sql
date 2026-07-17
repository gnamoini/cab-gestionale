-- Etichette magazzino: cache PNG/SVG oltre al PDF nel bucket pdf-artifacts.
-- Senza image/png e image/svg+xml: uploadLabelArtifact fallisce → 500 su /render?format=png|svg.

update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/png', 'image/svg+xml']
where id = 'pdf-artifacts';

notify pgrst, 'reload schema';
