#!/bin/bash
set -e

# Wait for MySQL to be ready
while ! mysqladmin ping -h"$MYSQL_HOST" --silent; do
    echo "Waiting for MySQL..."
    sleep 2
done

mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" -h"$MYSQL_HOST" "$MYSQL_DATABASE" < /docker-entrypoint-initdb.d/init.sql
