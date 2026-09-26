import type { Notification } from './interfaces/notification.interface';

export class NotificationEntity implements Notification {
  Id!: string;
  UserId!: string;
  Type!: string;
  Title!: string;
  Message!: string;
  Metadata!: Record<string, unknown>;
  ReadAt!: Date | null;
  CreatedAt!: Date;

  constructor(data: Notification) {
    Object.assign(this, data);
  }

  static create(
    userId: string,
    type: string,
    title: string,
    message: string,
    metadata: Record<string, unknown> = {}
  ): NotificationEntity {
    return new NotificationEntity({
      Id: '',
      UserId: userId,
      Type: type,
      Title: title,
      Message: message,
      Metadata: metadata,
      ReadAt: null,
      CreatedAt: new Date(),
    });
  }

  static from(data: Notification): NotificationEntity {
    return new NotificationEntity(data);
  }

  toPlain(): Notification {
    return { ...this };
  }
}
