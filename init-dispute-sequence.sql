-- Create the sequence for dispute IDs
CREATE SEQUENCE IF NOT EXISTS dispute_id_seq START 1;

-- Grant necessary permissions
GRANT USAGE,
SELECT
    ON SEQUENCE dispute_id_seq TO public;