const CACHE_KEY_PREFIX = {
  USERS: 'users',
  SESSIONS: 'sessions',
} as const;

const AuthCallbacks = {
  FACEBOOK: '/api/v1/auth/facebook/callback',
  GOOGLE: '/api/v1/auth/google/callback',
  GITHUB: '/api/v1/auth/github/callback',
} as const;

const AuthProviderType = {
  CUSTOM: 'custom',
  GOOGLE: 'google',
  FACEBOOK: 'facebook',
  GITHUB: 'github',
} as const;

const UserRoles = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator',
} as const;

const VerificationType = {
  EMAIL: 'email',
  PASSWORD_RESET: 'password_reset',
} as const;

const PlatformType = {
  WEB: 'web',
  MOBILE: 'mobile',
} as const;

const LocationType = {
  REGISTRATION: 'registration',
  LAST_LOGIN: 'last_login',
} as const;

const AvailableAuthProviders = Object.values(AuthProviderType);
const AvailableVerifications = Object.values(VerificationType);
const AvailablePlatforms = Object.values(PlatformType);
const AvailableUserRoles = Object.values(UserRoles);
const AvailableLocationTypes = Object.values(LocationType);

export {
  CACHE_KEY_PREFIX,
  AuthProviderType,
  AvailableAuthProviders,
  AvailableVerifications,
  VerificationType,
  AuthCallbacks,
  AvailablePlatforms,
  PlatformType,
  UserRoles,
  AvailableUserRoles,
  LocationType,
  AvailableLocationTypes,
};
