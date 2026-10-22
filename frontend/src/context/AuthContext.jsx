import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, getAuthToken, setAuthToken, getActiveUser, setActiveUser, getActiveRestaurant, setActiveRestaurant } from '../services/api';
import posService from '../services/pos.service';
import { normalizeRole, getDefaultPathForRole } from '../config/navigation';
import { clearUserQueryCache } from '../config/queryClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(getActiveUser());
  const [restaurant, setRestaurant] = useState(getActiveRestaurant());
  const [token, setTokenState] = useState(getAuthToken());
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [toasts, setToasts] = useState([]);

  // Toast notifier
  const addToast = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch /api/auth/me on mount if token exists
  useEffect(() => {
    const initAuth = async () => {
      const storedToken = getAuthToken();
      if (!storedToken) {
        setUser(null);
        setActiveUser(null);
        setRestaurant(null);
        setLoading(false);
        return;
      }
      try {
        const res = await posService.auth.me();
        if (res.success && res.data) {
          const rawUser = res.data.user || res.data;
          const orgId = rawUser.organizationId || rawUser.restaurantId || null;
          const normalizedUserData = {
            ...rawUser,
            organizationId: orgId,
            restaurantId: orgId,
          };
          const rawRest = res.data.restaurant || rawUser.restaurant || (orgId ? { id: orgId, organizationId: orgId } : null);
          const normalizedRestData = rawRest
            ? { ...rawRest, id: rawRest.id || orgId, organizationId: rawRest.organizationId || rawRest.id || orgId }
            : null;

          setUser(normalizedUserData);
          setRestaurant(normalizedRestData);
          setActiveUser(normalizedUserData);
          setActiveRestaurant(normalizedRestData);
        }
      } catch (err) {
        console.error('Session expired or invalid:', err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    initAuth();

    const handleUnauthorized = () => {
      addToast('Session expired. Please log in again.', 'warning');
      logout();
    };

    window.addEventListener('pos_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('pos_unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    try {
      // Immediately wipe existing cached queries before setting new session credentials
      clearUserQueryCache();

      const res = await posService.auth.login({ email, password });
      if (res.success && res.data) {
        const { token: receivedToken, user: loggedUser, restaurant: loggedRestaurant } = res.data;
        const normalizedRole = normalizeRole(loggedUser.role);
        const defaultPath = getDefaultPathForRole(normalizedRole);

        setAuthToken(receivedToken);
        setTokenState(receivedToken);

        const orgId = loggedUser.organizationId || loggedUser.restaurantId || null;
        let finalUser = {
          ...loggedUser,
          organizationId: orgId,
          restaurantId: orgId,
        };
        let finalRest = loggedRestaurant || loggedUser?.restaurant || (orgId ? { id: orgId, organizationId: orgId } : null);
        if (finalRest) {
          finalRest = { ...finalRest, id: finalRest.id || orgId, organizationId: finalRest.organizationId || finalRest.id || orgId };
        }

        // Immediately fetch authenticated profile to get full restaurant and user details
        try {
          const meRes = await posService.auth.me();
          if (meRes?.success && meRes?.data) {
            const meUser = meRes.data.user || meRes.data;
            const meRest = meRes.data.restaurant || meUser?.restaurant || null;
            if (meUser) {
              const profileOrgId = meUser.organizationId || meUser.restaurantId || orgId;
              finalUser = {
                ...meUser,
                organizationId: profileOrgId,
                restaurantId: profileOrgId,
              };
            }
            if (meRest) {
              const resolvedRestId = meRest.id || finalUser.restaurantId || orgId;
              finalRest = {
                ...meRest,
                id: resolvedRestId,
                organizationId: resolvedRestId,
              };
            }
          }
        } catch {
          // Keep basic login details if /me encounters a transient issue
        }

        setUser(finalUser);
        setActiveUser(finalUser);
        setRestaurant(finalRest);
        setActiveRestaurant(finalRest);
        addToast(`Welcome back, ${finalUser.name || loggedUser.name}!`, 'success');
        return {
          success: true,
          user: finalUser,
          role: normalizedRole,
          defaultPath,
        };
      }
      throw new Error(res.message || 'Login failed');
    } catch (err) {
      addToast(err.message || 'Login failed', 'error');
      throw err;
    }
  };

  const register = async (payload) => {
    try {
      clearUserQueryCache();
      const res = await posService.auth.register(payload);
      if (res.success && res.data) {
        const { token: receivedToken, user: registeredUser, restaurant: regRestaurant } = res.data;
        const normalizedRole = normalizeRole(registeredUser.role);
        const defaultPath = getDefaultPathForRole(normalizedRole);

        setAuthToken(receivedToken);
        setTokenState(receivedToken);

        const orgId = registeredUser.organizationId || registeredUser.restaurantId || regRestaurant?.id || null;
        const finalUser = {
          ...registeredUser,
          organizationId: orgId,
          restaurantId: orgId,
        };
        const activeRest = regRestaurant || registeredUser?.restaurant || (orgId ? { id: orgId, organizationId: orgId } : null);
        const finalRest = activeRest ? { ...activeRest, id: activeRest.id || orgId, organizationId: activeRest.organizationId || orgId } : null;

        setUser(finalUser);
        setActiveUser(finalUser);
        setRestaurant(finalRest);
        setActiveRestaurant(finalRest);
        addToast('Restaurant & Owner account registered successfully!', 'success');
        return {
          success: true,
          user: finalUser,
          role: normalizedRole,
          defaultPath,
        };
      }
      throw new Error(res.message || 'Registration failed');
    } catch (err) {
      addToast(err.message || 'Registration failed', 'error');
      throw err;
    }
  };

  const logout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);

    try {
      // 1. Dispatch real server-side logout request before credentials are wiped locally
      await posService.auth.logout();
    } catch (err) {
      // Gracefully continue local cleanup if backend is unreachable
      console.warn('Server-side logout notice:', err?.message || err);
    } finally {
      // 2. Clear protected React Query cache to stop in-flight queries and prevent data leakage
      clearUserQueryCache();

      // 3. Clear local storage authentication credentials and tenant session
      setAuthToken(null);
      setTokenState('');
      setUser(null);
      setActiveUser(null);
      setRestaurant(null);
      setActiveRestaurant(null);
      setLoggingOut(false);

      // 4. Safely transition route to /login
      if (window.location.pathname !== '/login') {
        window.history.replaceState(null, '', '/login');
      }
    }
  };

  const updateUserData = (updatedFields) => {
    setUser((prev) => {
      const next = typeof updatedFields === 'function' ? updatedFields(prev) : { ...prev, ...updatedFields };
      setActiveUser(next);
      return next;
    });
  };

  const normalizedRole = normalizeRole(user?.role);
  const resolvedOrgId = restaurant?.id || restaurant?.organizationId || user?.organizationId || user?.restaurantId || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role: normalizedRole,
        restaurant,
        restaurantId: resolvedOrgId,
        organizationId: resolvedOrgId,
        token,
        loading,
        loggingOut,
        toasts,
        addToast,
        removeToast,
        login,
        register,
        logout,
        setRestaurant,
        setUser: updateUserData,
        updateUser: updateUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
