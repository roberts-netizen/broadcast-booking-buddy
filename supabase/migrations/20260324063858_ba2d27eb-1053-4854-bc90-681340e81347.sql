ALTER TABLE leagues ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE CASCADE;
ALTER TABLE incoming_channels ADD COLUMN category_id uuid REFERENCES categories(id) ON DELETE CASCADE;