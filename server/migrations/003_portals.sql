-- Per-site access: each of the three websites (attendance, fees, finance) has
-- its own logins. A user may be granted one, two, or all three sites; signing
-- in happens per-site and issues a token valid only for that site's API.
ALTER TABLE users
  ADD COLUMN portals TEXT[] NOT NULL DEFAULT '{attendance,fees,finance}';
