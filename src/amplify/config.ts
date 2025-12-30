import { ResourcesConfig } from "aws-amplify";

// Amplify outputs pulled from amplify/#current-cloud-backend/amplify-meta.json
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: "eu-west-3_4syLEZetO",
      userPoolClientId: "qoh7i756nl41s9iscsbkabia2",
      identityPoolId: "eu-west-3:c1eaa760-cfb5-4ab9-a4f7-35a17efdf034",
      loginWith: { username: true },
      region: "eu-west-3",
    },
  },
};
