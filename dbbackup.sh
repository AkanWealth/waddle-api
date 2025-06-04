#!/bin/bash

# This script backs takes a backup of the database schema and saves it to a file.
pg_dump -h waddleapp-rds.c564s0oqi0ug.eu-north-1.rds.amazonaws.com -p 5432 -U root -s -F p -d waddledb > ./backup/schema.sql