import { Schema, model, type Types } from 'mongoose';
import { AUDIT_ACTIONS, type AuditAction } from '@lp/shared';

export type AuditTargetType = 'User' | 'Course';

export interface IAuditLog {
  actor: Types.ObjectId;
  // Snapshot, so the log stays readable after the actor's account is removed.
  actorUsername: string;
  action: AuditAction;
  targetType?: AuditTargetType;
  targetId?: Types.ObjectId;
  metadata: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorUsername: { type: String, required: true },
    action: { type: String, enum: Object.values(AUDIT_ACTIONS), required: true, index: true },
    targetType: { type: String, enum: ['User', 'Course'] },
    targetId: { type: Schema.Types.ObjectId },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });

export default model<IAuditLog>('AuditLog', auditLogSchema);
