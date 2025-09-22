CREATE TABLE IF NOT EXISTS cards (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(200),
    photo BYTEA,
    data_type VARCHAR(10) CHECK (data_type IN ('file','url')),
    data_file BYTEA,
    data_url VARCHAR(500),
    favorite BOOLEAN,
    created_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT data_file_or_url CHECK (
        (data_type='file' AND data_file IS NOT NULL AND data_url IS NULL) OR
        (data_type='url'  AND data_file IS NULL AND data_url IS NOT NULL)
    )
);