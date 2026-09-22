-- Fixes a bug that has silently broken every approval_queue insert since
-- 0001_init.sql: encode(bytes, 'base64url') is not a real Postgres encoding
-- (encode() only supports 'base64', 'hex', 'escape'), so the column default
-- always raised "unrecognized encoding" and the insert failed. Replicates
-- base64url (RFC 4648 §5) from standard base64 via translate + rtrim, using
-- only built-in functions.

alter table approval_queue
  alter column magic_link_token
  set default rtrim(translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_'), '=');
