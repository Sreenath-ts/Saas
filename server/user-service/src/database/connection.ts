import mysql from "mysql2";
import config from '../config/config';
const dbConfig = config.DB_URI;

export default mysql.createConnection({
    host: dbConfig.host,
  port:  dbConfig.port,
  user:  dbConfig.user,
  password: dbConfig.password,
  database: dbConfig.database,
});