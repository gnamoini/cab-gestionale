-- Pilot: bucket documenti completamente privato (accesso solo via signed URL + RLS).
update storage.buckets
set public = false
where id = 'documenti';
