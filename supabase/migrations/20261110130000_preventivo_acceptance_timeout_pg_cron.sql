-- Preventivo acceptance timeout via pg_cron (Vercel Hobby: no */15 vercel.json crons).

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'preventivo-acceptance-timeout-quarter-hourly';
    perform cron.schedule(
      'preventivo-acceptance-timeout-quarter-hourly',
      '*/15 * * * *',
      $cron$select public.process_preventivo_acceptance_timeouts(50);$cron$
    );
  end if;
exception when others then
  null;
end;
$do$;

comment on function public.process_preventivo_acceptance_timeouts(int) is
  'Batch timeout accettazione preventivo (24h). Schedulato via pg_cron ogni 15 min.';
