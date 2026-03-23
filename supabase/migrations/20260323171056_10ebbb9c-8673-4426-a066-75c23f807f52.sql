ALTER TABLE categories ADD COLUMN has_source_pool boolean NOT NULL DEFAULT false;
ALTER TABLE categories ADD COLUMN has_taker_pool boolean NOT NULL DEFAULT true;