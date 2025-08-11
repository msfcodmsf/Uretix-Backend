import { Request } from "express";
import { IUser } from "../models/User.model";

export interface AuthRequest extends Request {
  user?: IUser;
}
