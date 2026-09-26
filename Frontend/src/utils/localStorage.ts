// Get token from localStorage
export const getToken = (): string | null => {
  try {
    const token = localStorage.getItem("token");
    return token ? JSON.parse(token) : null;
  } catch (error) {
    console.error("Error parsing token from localStorage:", error);
    return null;
  }
};

// Set token in localStorage
export const setToken = (token: any): void => {
  try {
    localStorage.setItem("token", JSON.stringify(token));
  } catch (error) {
    console.error("Error setting token in localStorage:", error);
  }
};

// Remove token from localStorage
export const removeToken = (): void => {
  try {
    localStorage.removeItem("token");
  } catch (error) {
    console.error("Error removing token from localStorage:", error);
  }
};

// Get user data from localStorage
export const getUserData = <T = any>(): T | null => {
  try {
    const data = localStorage.getItem("data");
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return null;
  }
};

// Set user data in localStorage
export const setUserData = (userData: any): void => {
  try {
    localStorage.setItem("data", JSON.stringify(userData));
  } catch (error) {
    console.error("Error setting user data in localStorage:", error);
  }
};

// Remove user data from localStorage
export const removeUserData = (): void => {
  try {
    localStorage.removeItem("data");
  } catch (error) {
    console.error("Error removing user data from localStorage:", error);
  }
};

// Clear all auth-related data from localStorage
export const clearAuthData = (): void => {
  removeToken();
  removeUserData();
};
