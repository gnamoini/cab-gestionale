from pathlib import Path

root = Path(__file__).resolve().parents[1]
core = (root / "supabase/rbac_core.sql").read_text(encoding="utf-8")
mig_path = root / "supabase/migrations/20260519150100_rbac_capabilities_refactor.sql"
mig = mig_path.read_text(encoding="utf-8")
idx = mig.index("-- Drop policy applicative legacy")
tail = mig[idx:]
out = "-- RBAC capability refactor: rbac_has_capability + policy unificate.\n\n" + core + "\n\n" + tail
mig_path.write_text(out, encoding="utf-8")
print("written", len(out), "bytes")
