INSERT INTO cards (name, description, photo, data_type, data_file, data_url, favorite, created_at)
VALUES (
    'F1 API',
    'Public API with data from Formula 1',
    pg_read_binary_file('/database/seeds/photos/car_photo.jpg'),  -- lê o conteúdo binário
    'url',
    NULL,
    'https://f1.com',
    true,
    '2025-09-13'
);

INSERT INTO cards (name, description, photo, data_type, data_file, data_url, favorite, created_at)
VALUES (
    'Airplane crash API',
    'Public API with data aiplanes crashes',
    pg_read_binary_file('/database/seeds/photos/airplane_crash.jpeg'),  -- lê o conteúdo binário
    'url',
    NULL,
    'https://f1.com',
    false,
    '2025-09-13'
);