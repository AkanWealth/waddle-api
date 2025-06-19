#!/bin/bash

# This script backs takes a backup of the database schema and saves it to a file.
pg_dump -h waddleapp-rds.c564s0oqi0ug.eu-north-1.rds.amazonaws.com -p 5432 -U root -s -F p -d waddledb > ./backup/schema.sql

# backup database data to a tar file
pg_dump -h waddleapp-rds.c564s0oqi0ug.eu-north-1.rds.amazonaws.com -p 5432 -U root -W -F t -d waddledb > ./backup/db.tar

# restrore the database data from a tar file
pg_restore -h waddleapp-rds.c564s0oqi0ug.eu-north-1.rds.amazonaws.com -p 5432 -U root -d waddledb -W ./backup/db.tar