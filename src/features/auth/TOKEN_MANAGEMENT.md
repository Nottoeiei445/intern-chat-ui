# Token Management & Session Configuration Guide

## Overview

This guide explains how the token refresh and session management system works in your authentication module. All configurable values are centralized in `auth.config.ts` to avoid modifying code when you need to adjust timings or settings.

---

## Configuration File

**Location:** `src/features/auth/config/auth.config.ts`

All configurable settings are in the `AUTH_CONFIG` object. You can modify these values without touching any other code.

### Key Configuration Sections

#### 1. **API Configuration**
```typescript
api: {
  baseURL: "https://ada-anthropopathic-ai.ngrok-free.dev",
  withCredentials: true,
  headers: { ... }
}
```
- Change `baseURL` if your API domain changes
- `withCredentials: true` ensures cookies are sent with API requests (required for refresh token)

#### 2. **Token Configuration (in minutes)**
```typescript
token: {
  accessTokenExpiryMinutes: 15,        // How long access token is valid
  refreshTokenExpiryMinutes: 10080,    // How long refresh token is valid (7 days)
  refreshThresholdMinutes: 2,          // Refresh token when this close to expiration
}
```

**What these mean:**
- **accessTokenExpiryMinutes (15)**: Your access token is valid for 15 minutes. After that, it expires.
- **refreshTokenExpiryMinutes (10080)**: Your refresh token (stored in HTTP-only cookie) is valid for 7 days.
- **refreshThresholdMinutes (2)**: When the access token is about to expire (within 2 minutes), the system will automatically get a new one using the refresh token.

**How to adjust:**
- Increase `accessTokenExpiryMinutes` for longer token validity (less frequent refreshes)
- Decrease it for better security (more frequent refreshes)
- Adjust `refreshThresholdMinutes` to control when proactive refresh happens

#### 3. **Endpoints**
```typescript
endpoints: {
  login: "/auth/login",
  refresh: "/auth/refresh",
  logout: "/auth/logout",
  getCurrentUser: "/auth/me",
}
```
- Change these if your backend API endpoints differ

#### 4. **Session Management**
```typescript
session: {
  tokenCheckIntervalMs: 60000,              // Check every 1 minute
  refreshTokenCookieName: "refreshToken",
  tokenExpiryStorageKey: "tokenExpiry",
  userStorageKey: "user",
}
```

**What these mean:**
- **tokenCheckIntervalMs (60000ms = 1 minute)**: Every minute, the system checks if the token is about to expire
- **refreshTokenCookieName**: The name of the HTTP-only cookie storing the refresh token
- Adjust `tokenCheckIntervalMs` if you want more/less frequent checks

#### 5. **Feature Flags**
```typescript
features: {
  enableProactiveRefresh: true,        // Auto-refresh before expiration
  enableSessionPersistence: true,      // Restore session on page reload
  enableAuthLogging: true,             // Console logs for debugging
}
```

- Set `enableProactiveRefresh: false` to disable automatic token refresh
- Set `enableAuthLogging: false` to disable debug logs
- `enableSessionPersistence` restores your session when you refresh the page

---

## How Token Refresh Works

### Automatic (Proactive) Refresh

When `enableProactiveRefresh` is `true`:

1. **Every minute** (configurable), the AuthContext checks: "Is the access token expiring soon?"
2. If the token will expire within 2 minutes (configurable), it automatically:
   - Sends the refresh token (stored in HTTP-only cookie) to `/auth/refresh` endpoint
   - Gets a new access token
   - Updates token expiration time
3. No login is required; happens silently in the background

### Manual Refresh

You can also manually refresh the token in your components:

```typescript
import { useAuth } from "@/features/auth/context/AuthContext";

export function MyComponent() {
  const { refreshToken, timeUntilExpiry } = useAuth();
  
  return (
    <div>
      <p>Token expires in {Math.round(timeUntilExpiry / 1000)} seconds</p>
      <button onClick={() => refreshToken()}>
        Refresh Token Now
      </button>
    </div>
  );
}
```

### Automatic Refresh on API Error

If a request fails with a 401 (Unauthorized) status:

1. The system automatically retries the request using the refresh token
2. If refresh succeeds, the original request is retried
3. If refresh fails, you're redirected to the login page

---

## Using the Auth Context in Components

```typescript
import { useAuth } from "@/features/auth/context/AuthContext";

export function Dashboard() {
  const { 
    user,              // Current user object
    accessToken,       // Current access token
    isLoading,         // True during login
    isInitialized,     // True when session check is complete
    error,             // Error message if login/refresh fails
    login,             // Function to login
    logout,            // Function to logout
    refreshToken,      // Function to manually refresh
    timeUntilExpiry    // Milliseconds until token expires
  } = useAuth();

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div>
      <p>Welcome, {user.username}!</p>
      <p>Token expires in: {Math.round(timeUntilExpiry / 1000)}s</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

---

## Common Scenarios & Solutions

### Scenario 1: Tokens refreshing too frequently
**Problem:** You see "Proactive token refresh" messages in the console too often.

**Solution:** Increase `accessTokenExpiryMinutes` in the config:
```typescript
token: {
  accessTokenExpiryMinutes: 30,  // Changed from 15 to 30 minutes
  refreshThresholdMinutes: 5,    // Can also increase threshold
}
```

### Scenario 2: Session not persisting on page reload
**Problem:** You refresh the page and get logged out.

**Solution:** Ensure this is enabled in config:
```typescript
features: {
  enableSessionPersistence: true,  // Must be true
}
```

### Scenario 3: User gets logged out during inactivity
**Problem:** After leaving the page idle, token expires and they're logged out.

**Solution:** This is by design! However, you can:
- Increase `accessTokenExpiryMinutes` to keep tokens valid longer
- Decrease `refreshThresholdMinutes` to refresh earlier
- Increase `refreshTokenExpiryMinutes` so refreshes work longer

### Scenario 4: Backend returns different expiration format
**Problem:** Your backend returns `expiresIn` in a different format (not seconds).

**Solution:** Modify the `calculateExpiresAt` function in `auth.service.ts` to match your backend's format.

---

## Debugging

### Enable Detailed Logs
Ensure this in your config:
```typescript
features: {
  enableAuthLogging: true,  // Shows all auth events in console
}
```

You'll see messages like:
```
Session restored successfully on app load.
Token expiring soon. Attempting proactive refresh...
Proactive token refresh successful.
Token manually refreshed successfully.
```

### Check Token Expiration Programmatically
```typescript
import { authService } from "@/features/auth/services/auth.service";

// Get milliseconds until token expires
const timeUntilExpiry = authService.getTimeUntilExpiry();
console.log(`Token expires in ${timeUntilExpiry / 1000} seconds`);

// Check if token is expiring soon
const isExpiringSoon = authService.isTokenExpiringSoon();
console.log(`Token expiring soon? ${isExpiringSoon}`);
```

---

## Important Notes

### Security
- ✅ Refresh token is stored in an **HTTP-only cookie** (cannot access via JavaScript)
- ✅ Access token is stored in memory and localStorage for expiration tracking
- ✅ Automatic 401 refresh prevents unauthorized requests
- ✅ Invalid refresh tokens redirect to login automatically

### Performance
- The token check interval (1 minute by default) is balanced for performance
- Proactive refresh happens silently without interrupting the user
- No unnecessary API calls are made

### Logout
- When you logout, both access and refresh tokens are cleared
- The backend is notified to invalidate the cookie
- Session data is removed from localStorage

---

## API Response Format Expected

Your backend should return responses in this format:

```typescript
{
  success: true,
  message: "Token refreshed successfully",
  data: {
    user: {
      id: "123",
      email: "user@example.com",
      username: "john_doe"
    },
    accessToken: "eyJhbGciOiJIUzI1NiIs...",
    expiresIn: 900  // Token expiration in seconds (optional)
  }
}
```

If your backend doesn't return `expiresIn`, the system falls back to the `accessTokenExpiryMinutes` from config.

---

## Quick Reference: Configuration Changes

| Need | Config Key | Default | Change To |
|------|-----------|---------|-----------|
| Longer token validity | `token.accessTokenExpiryMinutes` | 15 | 30 or 60 |
| Less frequent checks | `session.tokenCheckIntervalMs` | 60000 | 120000 |
| Earlier proactive refresh | `token.refreshThresholdMinutes` | 2 | 5 or 10 |
| Disable auto-refresh | `features.enableProactiveRefresh` | true | false |
| Disable logs | `features.enableAuthLogging` | true | false |
| Different API URL | `api.baseURL` | ngrok URL | your domain |

---

## Support

If you need to add or modify token behavior:

1. **New config option?** Add it to `AUTH_CONFIG` in `auth.config.ts`
2. **New auth method?** Add it to `authService` in `auth.service.ts`
3. **New context feature?** Extend `AuthContextType` and add to `AuthProvider`

All changes are isolated to the auth module - no need to modify other components!
