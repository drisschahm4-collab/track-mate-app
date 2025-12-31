import { ResourcesConfig } from "aws-amplify";

// Amplify outputs pulled from amplify/#current-cloud-backend/amplify-meta.json
export const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolId: "eu-west-3_4syLEZetO",
      userPoolClientId: "qoh7i756nl41s9iscsbkabia2",
      identityPoolId: "eu-west-3:c1eaa760-cfb5-4ab9-a4f7-35a17efdf034",
      loginWith: { username: true },
    },
  },
  API: {
    GraphQL: {
      endpoint: "https://c2yd53frvfff7fkdkwwu7u3ahu.appsync-api.eu-west-3.amazonaws.com/graphql",
      region: "eu-west-3",
      defaultAuthMode: "userPool",
      apiKey: "da2-2jbdfcic3fhehcnjb6mce2gtgq",
    },
  },
};
