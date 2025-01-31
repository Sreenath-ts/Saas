import { RowDataPacket, OkPacket } from "mysql2";
import connection from "../connection";

export interface IUser extends RowDataPacket {
  name: string;
  email: string;
  password: string;
  createdAt?: Date;
  updatedAt?: Date;
}

 interface IUserRepository {
  save(user: IUser): Promise<IUser>;
  retrieveById(userId: number): Promise<IUser | undefined>;
  retrieveByValue(value: string, field: "name" | "email"): Promise<IUser | undefined>;
}

 class UserRepository implements IUserRepository {
  save(user: IUser): Promise<IUser> {
    return new Promise((resolve, reject) => {
      connection.query<OkPacket>(
        "INSERT INTO users (name,email,password) VALUES(?,?,?)",
        [user.name, user.email, user.password],
        (err, res) => {
          if (err) reject(err);
          else
            this.retrieveById(res.insertId)
              .then((retrievedUser) => {
                if (retrievedUser) {
                  resolve(retrievedUser);
                } else {
                  reject(new Error("User not found after insertion"));
                }
              })
              .catch(reject);
        }
      );
    });
  }

  retrieveById(userId: number): Promise<IUser | undefined> {
    return new Promise((resolve, reject) => {
      connection.query<IUser[]>(
        "SELECT * FROM user WHERE id = ?",
        [userId],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }
  retrieveByValue(value: string, field: "name" | "email"): Promise<IUser | undefined> {
    return new Promise((resolve, reject) => {
       connection.query<IUser[]>(
        `SELECT * FROM users WHERE ${field} = ? LIMIT 1`,
        [value],
        (err, res) => {
          if (err) reject(err);
          else resolve(res?.[0]);
        }
      );
    });
  }
}

export default new UserRepository()
