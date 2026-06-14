export interface User {
  Id: string;
  Username: string;
  Email: string;
  FirstName: string;
  LastName: string;
  AuthHash: string;
  CreatedAt?: Date;
}
