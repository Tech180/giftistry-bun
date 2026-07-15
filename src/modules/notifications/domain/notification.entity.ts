export interface Notification {
  Id: string;
  UserId: string;
  Type: string;
  Title: string;
  Message: string;
  Metadata: Record<string, unknown>;
  ReadAt: Date | null;
  CreatedAt: Date;
}

export interface NotificationPrefs {
  UserId: string;
  EmailAlerts: boolean;
  Marketing: boolean;
  FriendRequests: boolean;
  ListShares: boolean;
  ItemClaims: boolean;
  Comments: boolean;
  UpdatedAt: Date;
}

export type NotificationPrefsUpdate = Partial<
  Pick<NotificationPrefs, 'EmailAlerts' | 'Marketing' | 'FriendRequests' | 'ListShares' | 'ItemClaims' | 'Comments'>
>;

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

  markRead(): void {
    this.ReadAt = new Date();
  }

  isRead(): boolean {
    return this.ReadAt !== null;
  }
}
