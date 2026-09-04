export interface Credentials {
  username: string;
  password: string;
}

export interface AuthSession extends Credentials {
  providerId: string;
  createdAt: number;
}
