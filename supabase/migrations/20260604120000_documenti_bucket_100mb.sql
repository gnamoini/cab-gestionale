-- Aumenta limite upload bucket documenti a 100 MB (idempotente).
update storage.buckets
set file_size_limit = 104857600
where id = 'documenti';
