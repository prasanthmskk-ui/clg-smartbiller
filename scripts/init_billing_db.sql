-- Run as MySQL root. Replace the placeholder password before running.
CREATE DATABASE IF NOT EXISTS billing_db
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'billing_user'@'localhost'
  IDENTIFIED BY 'CHANGE_ME_BEFORE_RUNNING';
CREATE USER IF NOT EXISTS 'billing_user'@'127.0.0.1'
  IDENTIFIED BY 'CHANGE_ME_BEFORE_RUNNING';

GRANT ALL PRIVILEGES ON billing_db.* TO 'billing_user'@'localhost';
GRANT ALL PRIVILEGES ON billing_db.* TO 'billing_user'@'127.0.0.1';
FLUSH PRIVILEGES;

USE billing_db;
SOURCE src/3_Database/schema.sql;
