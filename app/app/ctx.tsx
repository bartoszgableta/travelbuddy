import { createContext, useContext, useEffect, useState } from "react";
import { AuthProps, Credentials } from "@/types/auth";
import { Amplify } from "aws-amplify";
import {
  fetchAuthSession,
  confirmSignUp as cognitoConfirmSignUp,
  resendSignUpCode,
  signIn as cognitoSignIn,
  signOut as cognitoSignOut,
  signUp as cognitoSignUp,
} from "aws-amplify/auth";
import { amplifyConfig } from "@/config/amplifyConfig";
import axios from "axios";

Amplify.configure(amplifyConfig);

const EXPIRATION_BUFFER = 5 * 60 * 1000; // 5 minutes
const TIMEOUT_DURATION = 60000; // 60 seconds

// axios
const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: TIMEOUT_DURATION,
});

// cache
let cachedAccessToken: string | null = null;
let tokenExpiration: number = 0;

const AuthContext = createContext<AuthProps>({});

export const useAuth = () => {
  return useContext(AuthContext);
};

export const AuthProvider = ({ children }: any) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const signUp = async (credentials: Credentials) => {
    const { email, password } = credentials;
    try {
      const response = await cognitoSignUp({ username: email, password });
    } catch (error) {
      console.error("Sign up error:", error);
      throw error;
    }
  };

  const resendSignUp = async (credentials: Credentials) => {
    const { email } = credentials;
    try {
      const response = await resendSignUpCode({ username: email });
    } catch (error) {
      console.error("Resend sign up error:", error);
      throw error;
    }
  };

  const confirmSignUp = async (email: string, code: string) => {
    try {
      const response = await cognitoConfirmSignUp({
        username: email,
        confirmationCode: code,
      });
    } catch (error) {
      console.error("Confirm sign up error:", error);
      throw error;
    }
  };

  const signIn = async (credentials: Credentials) => {
    const { email, password } = credentials;
    try {
      const response = await cognitoSignIn({
        username: email,
        password,
      });
      setIsAuthenticated(true);
      return response;
    } catch (error: any) {
      console.error("Sign in error:", error);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      const response = await cognitoSignOut();
      cachedAccessToken = null;
      setIsAuthenticated(false);
      return response;
    } catch (error) {
      console.error("Sign out error:", error);
      throw error;
    }
  };

  const getAccessToken = async () => {
    const bufferTime = EXPIRATION_BUFFER; // Refresh 5 minutes before expiration

    if (cachedAccessToken && Date.now() < tokenExpiration - bufferTime) {
      setIsAuthenticated(true);
      return cachedAccessToken;
    }

    const session = await fetchAuthSession();

    if (
      session.tokens === undefined ||
      session.tokens.accessToken.payload.exp === undefined
    ) {
      cachedAccessToken = null;
      setIsAuthenticated(false);
      return null;
    }

    cachedAccessToken = session.tokens.accessToken.toString();
    tokenExpiration = session.tokens.accessToken.payload.exp * 1000;

    setIsAuthenticated(!!cachedAccessToken);
    return cachedAccessToken;
  };

  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);
      try {
        const fetchedToken = await getAccessToken();
        setIsAuthenticated(!!fetchedToken);
      } catch (error) {
        console.error("Auth initialization error:", error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };
    // check if user is authenticated
    initializeAuth();

    // set up axios
    api.interceptors.request.clear();
    api.interceptors.request.use(
      async (config) => {
        try {
          const token = await getAccessToken();
          console.log("Token found, appending to headers");
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.warn("Token not found:", error);
        }
        return config;
      },
      (error) => {
        console.error("Axios request error:", error);
        return Promise.reject(error);
      },
    );
  }, []);

  const value = {
    isLoading,
    isAuthenticated,
    signUp,
    resendSignUp,
    confirmSignUp,
    signIn,
    signOut,
    api,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default {};
