FROM postgres:16


COPY seeds/create_table.sql /docker-entrypoint-initdb.d/
COPY seeds/seed_data.sql /docker-entrypoint-initdb.d/
COPY seeds/photos /database/seeds/photos


WORKDIR /database

CMD ["postgres"]
