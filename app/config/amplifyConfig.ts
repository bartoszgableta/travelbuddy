import { Amplify } from "aws-amplify";

if (
  !process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID ||
  !process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID
) {
  throw new Error("Missing Amplify configuration in environment variables");
}

export const amplifyConfig: Parameters<(typeof Amplify)["configure"]>[0] = {
  Auth: {
    Cognito: {
      userPoolId: process.env.EXPO_PUBLIC_COGNITO_USER_POOL_ID,
      userPoolClientId: process.env.EXPO_PUBLIC_COGNITO_CLIENT_ID,
      signUpVerificationMethod: "code",
    },
  },
};
