-- Extensions for live location (spec S3): random tokens and hashing, and scheduled deletion.
create extension if not exists pgcrypto with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
