-- Recyclage des artefacts contre des Ryō (v0.3.0) : nouvelle raison du journal.
ALTER TYPE "LedgerReason" ADD VALUE IF NOT EXISTS 'ARTIFACT_RECYCLE';
