import { Schema, model, type HydratedDocument, type Types } from 'mongoose';
import { ROLES, USER_STATUS, type Role, type UserStatus } from '@lp/shared';

export interface IUser {
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  role: Role;
  status: UserStatus;
  tokenVersion: number;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type UserDocument = HydratedDocument<IUser>;

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.STUDENT, index: true },
    status: {
      type: String,
      enum: Object.values(USER_STATUS),
      default: USER_STATUS.ACTIVE,
      index: true,
    },
    tokenVersion: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  {
    timestamps: true,
    toJSON: {
      // Secrets never leave the server, even if a query selected them.
      transform(_doc, ret) {
        const { passwordHash, tokenVersion, __v, ...safe } = ret;
        return safe;
      },
    },
  },
);

// Exactly one super admin, enforced by MongoDB itself.
userSchema.index(
  { role: 1 },
  { unique: true, partialFilterExpression: { role: ROLES.SUPERADMIN }, name: 'single_superadmin' },
);

export default model<IUser>('User', userSchema);
