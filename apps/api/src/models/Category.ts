import { Schema, model, type HydratedDocument, type Types } from 'mongoose';

export interface ICategory {
  name: string;
  /** Lowercased name: "design" and "Design" are the same category. */
  key: string;
  /** Hidden categories stay on existing courses but can't be picked for new ones. */
  active: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type CategoryDocument = HydratedDocument<ICategory>;

const categorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true },
    key: { type: String, required: true, unique: true },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true, versionKey: false },
);

categorySchema.pre('validate', function setKey() {
  this.key = this.name.trim().toLowerCase();
});

export default model<ICategory>('Category', categorySchema);
