import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/api";
import { amplifyConfig } from "@/amplify/config";

let configured = false;
const ensureAmplifyConfigured = () => {
  if (!configured) {
    Amplify.configure(amplifyConfig);
    configured = true;
  }
};

let client: ReturnType<typeof generateClient> | null = null;
const getClient = () => {
  ensureAmplifyConfigured();
  if (!client) {
    client = generateClient();
  }
  return client;
};

const CREATE_DVD = /* GraphQL */ `
  mutation CreateDvD($input: CreateDvDInput!) {
    createDvD(input: $input) {
      id
      dvDVehicleImmat
      dvDDriverSub
      assignmentDate
      unassignmentDate
    }
  }
`;

export interface CreateDvdInput {
  dvDVehicleImmat: string;
  dvDDriverSub: string;
  companyDvDCompanyId: string;
  assignmentDate: string;
}

export async function createDvd(input: CreateDvdInput) {
  console.log('[CreateDvD] Creating DvD:', input);

  const response = await getClient().graphql({
    query: CREATE_DVD,
    variables: { input },
    authMode: "userPool",
  });

  console.log('[CreateDvD] Response:', JSON.stringify(response, null, 2));

  const data = 'data' in response ? response.data : null;
  const typedData = data as { createDvD?: {
    id: string;
    dvDVehicleImmat?: string | null;
    dvDDriverSub?: string | null;
    assignmentDate?: string | null;
    unassignmentDate?: string | null;
  } | null } | null;

  return typedData?.createDvD || null;
}
