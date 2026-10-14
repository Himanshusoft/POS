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
          const userData = res.data.user || res.data;
          const restData = res.data.restaurant || userData.restaurant || (userData.restaurantId ? { id: userData.restaurantId } : null);
          setUser(userData);
          setRestaurant(restData);
          setActiveUser(userData);
          setActiveRestaurant(restData);
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
      const res = await posService.auth.login({ email, password });
      if (res.success && res.data) {
        const { token: receivedToken, user: loggedUser, restaurant: loggedRestaurant } = res.data;
        const normalizedRole = normalizeRole(loggedUser.role);
        const defaultPath = getDefaultPathForRole(normalizedRole);

        setAuthToken(receivedToken);
        setTokenState(receivedToken);

        let finalUser = loggedUser;
        let finalRest = loggedRestaurant || loggedUser?.restaurant || (loggedUser?.restaurantId ? { id: loggedUser.restaurantId } : null);

        // Immediately fetch authenticated profile to get full restaurant and user details
        try {
          const meRes = await posService.auth.me();
          if (meRes?.success && meRes?.data) {
            const meUser = meRes.data.user || meRes.data;
            const meRest = meRes.data.restaurant || meUser?.restaurant || null;
            if (meUser) finalUser = meUser;
            if (meRest) finalRest = meRest;
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
      const res = await posService.auth.register(payload);
      if (res.success && res.data) {
        const { token: receivedToken, user: registeredUser, restaurant: regRestaurant } = res.data;
        const normalizedRole = normalizeRole(registeredUser.role);
        const defaultPath = getDefaultPathForRole(normalizedRole);

        setAuthToken(receivedToken);
        setTokenState(receivedToken);
        setUser(registeredUser);
        setActiveUser(registeredUser);
        const activeRest = regRestaurant || registeredUser?.restaurant || (registeredUser?.restaurantId ? { id: registeredUser.restaurantId } : null);
        setRestaurant(activeRest);
        setActiveRestaurant(activeRest);
        addToast('Restaurant & Owner account registered successfully!', 'success');
        return {
          success: true,
          user: registeredUser,
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

  return (
    <AuthContext.Provider
      value={{
        user,
        role: normalizedRole,
        restaurant,
        restaurantId: restaurant?.id || user?.restaurantId || null,
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
