const { Sequelize } = require("sequelize");
require("dotenv").config();

// Two ways to configure the database:
//  - DATABASE_URL=postgresql://user:password@host/dbname   (hosting: Neon, Render...)
//  - DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT        (local PostgreSQL)
//
// SSL is used when DB_SSL=true or when the URL asks for it (sslmode=require),
// which is the case for hosted databases like Neon.

const url = process.env.DATABASE_URL;
const useSsl = process.env.DB_SSL === "true" || /sslmode=require/.test(url || "");

const options = {
    dialect: "postgres",
    logging: false,
    ...(useSsl
        ? { dialectOptions: { ssl: { require: true, rejectUnauthorized: false } } }
        : {})
};

const sequelize = url
    ? new Sequelize(url, options)
    : new Sequelize(
        process.env.DB_NAME,
        process.env.DB_USER,
        process.env.DB_PASSWORD,
        {
            ...options,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT
        }
    );

module.exports = sequelize;
