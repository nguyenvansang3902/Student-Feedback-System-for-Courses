import type {
  Role,
  ScopeType,
  SessionPurpose,
} from "../../generated/prisma/enums";

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
    public readonly code = "INVALID_REQUEST",
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export interface AuthActor {
  userId: string;
  loginCode: string;
  email: string;
  displayName: string;
  roles: Role[];
  sessionId: string;
  familyId: string;
  mustChangePassword: boolean;
  mfa: boolean;
  purpose?: SessionPurpose;
  mfaRequired?: boolean;
  assignments?: {
    role: Role;
    scopeType: ScopeType;
    facultyId: string | null;
    departmentId: string | null;
  }[];
}

export interface AuthContext {
  ip: string;
  userAgent?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
  actor: AuthActor;
}
