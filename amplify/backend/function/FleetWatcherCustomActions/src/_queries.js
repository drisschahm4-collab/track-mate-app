const SCHEDULED_ASSIGNMENTS_QUERY = `
query QUERY($dvDVehicleImmat: String!, $assignmentDate: String!, $nextToken: String) {
  dvDSByDvDVehicleImmat(dvDVehicleImmat: $dvDVehicleImmat, nextToken: $nextToken, filter: {
  or: [{unassignmentDate: {attributeExists: false}}, {unassignmentDate: {ge: $assignmentDate}}]}) {
    items {
      id
      dvDCompanyId
      dvDDriverSub
      dvDVehicleImmat
      assignmentDate
      unassignmentDate
    }
    nextToken
  }
}
`;

const UPDATE_DVD_QUERY = `
  mutation Mutation($input: UpdateDvDInput!) {
    updateDvD(input: $input) {
      id
    }
  }
`;

const GET_VEHICLE_QUERY = `
  query Query($immat: String!) {
    getVehicle(immat: $immat) {
      vehicleDeviceImei
      companyVehiclesId
    }
  }
`;

const CREATE_DVD_QUERY = `
  mutation Mutation($input: CreateDvDInput!) {
    createDvD(input: $input) {
      id
    }
  }
`;

const DELETE_DVD_QUERY = `
mutation Mutation ($id: ID!){
  deleteDvD(input: {id: $id}) {
    id
  }
}
`;

const CREATE_VEHICLE_ALERT_QUERY = `
  mutation Mutation($input: CreateVehicleAlertsInput!) {
    createVehicleAlerts(input: $input) {
      id
    }
  }
`;

const GET_ALERT_QUERY = `
  query QUERY($id: ID!) {
    getAlert(id: $id) {
      type
    }
  }
`;

const GET_ALERT_DEFINITION = `
  query QUERY($key: AlertType!) {
    getAlertDefinition(key: $key) {
      isFlespi
      calculator
    }
  }
`;

const DELETE_VEHICLE_ALERT_QUERY = `
  mutation Mutation($id: ID!) {
    deleteVehicleAlerts(input: {id: $id}) { id }
  }
`;

const CHECK_VEHICLE_ALERT_QUERY = `
  query LIST_VEHICLE_ALERTS($alertId: ID!, $vehicleImmat: String!) {
    listVehicleAlerts(filter: {and: {alertId: {eq: $alertId}, vehicleImmat: {eq: $vehicleImmat}}}) {
      items { id }
    }
  }
`;

const LIST_BUSINESS_ALERTS_QUERY = `
query Query($vehicleImmat: String!, $nextToken: String) {
  vehicleAlertsByVehicleImmat(vehicleImmat: $vehicleImmat, nextToken: $nextToken, filter: {isFlespi: {eq: false}}) {
    items {
      alert {
        id
      }
    }
    nextToken
  }
}
`;

const VEHICLE_ALERTS_BY_ALERT_QUERY = `
query Query($alertId: ID!, $nextToken: String) {
  vehicleAlertsByAlertId(alertId: $alertId, nextToken: $nextToken) {
    items {
      id
      isFlespi
      vehicleImmat
    }
    nextToken
  }
}`;

const DELETE_ALERT_QUERY = `
mutation Mutation($id: ID!) {
  deleteAlert(input: {id: $id}) {
    id
  }
}
`

const DELETE_VEHICLE_ALERT_STATE_QUERY = `
mutation Mutation($id: String!) {
  deleteVehicleAlertState(input: {id: $id}) {
    id
  }
}
`

export {
  DELETE_ALERT_QUERY,
  DELETE_VEHICLE_ALERT_STATE_QUERY,
  DELETE_DVD_QUERY,
  DELETE_VEHICLE_ALERT_QUERY,
  CREATE_VEHICLE_ALERT_QUERY,
  CHECK_VEHICLE_ALERT_QUERY,
  LIST_BUSINESS_ALERTS_QUERY,
  GET_ALERT_DEFINITION,
  GET_VEHICLE_QUERY,
  CREATE_DVD_QUERY,
  UPDATE_DVD_QUERY,
  GET_ALERT_QUERY,
  SCHEDULED_ASSIGNMENTS_QUERY,
  VEHICLE_ALERTS_BY_ALERT_QUERY
}
