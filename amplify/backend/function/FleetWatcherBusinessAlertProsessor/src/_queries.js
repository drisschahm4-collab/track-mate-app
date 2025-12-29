const GET_DEVICE_QUERY = `
  query MyQuery($imei: String!) {
    getDevice(imei: $imei) {
      imei
      deviceVehicleImmat
      vehicle {
        immat
        fuelType
        companyVehiclesId
      }
    }
  }
`;

const LIST_VEHICLE_ALERTS_QUERY = `
query Query($vehicleImmat: String!, $nextToken: String) {
  vehicleAlertsByVehicleImmat(vehicleImmat: $vehicleImmat, nextToken: $nextToken, filter: {isFlespi: {eq: false}}) {
    items {
      alert {
        id
        type
        extra
        alertZoneId
        emailTemplate
        smsTemplate
        zone {
          id
          lat
          lng
          name
          radius
        }
      }
    }
    nextToken
  }
}
`;

const GET_ALERT_STATE_QUERY = `
  query MyQuery($id: String!) {
    getVehicleAlertState(id: $id) {
      state
      timestamp
    }
  }
`;

const CREATE_ALERT_STATE_QUERY = `
  mutation MyMutation($input: CreateVehicleAlertStateInput!) {
    createVehicleAlertState(input: $input) {
      id
    }
  }
`;

const UPDATE_ALERT_STATE_QUERY = `
  mutation MyMutation($input: UpdateVehicleAlertStateInput!) {
    updateVehicleAlertState(input: $input) {
      id
    }
  }
`;

const CURRENT_DRIVER_QUERY = `
query QUERY($dvDVehicleImmat: String!, $timestamp: String!, $nextToken: String) {
  dvDSByDvDVehicleImmat(dvDVehicleImmat: $dvDVehicleImmat, nextToken: $nextToken, filter: {
  and:[{assignmentDate: {le: $timestamp}}, {or:[{unassignmentDate: {attributeExists: false}}, {unassignmentDate: {gt: $timestamp}}]}]}) {
    items {
      dvDCompanyId
      dvDDriverSub
      dvDVehicleImmat
      driver {
        lastname
        firstname
        email
        mobile
        sub
      }
      vehicle {
        immat
        fuelType
        companyVehiclesId
      }
    }
    nextToken
  }
}
`;

export {
  CURRENT_DRIVER_QUERY,
  GET_DEVICE_QUERY,
  GET_ALERT_STATE_QUERY,
  CREATE_ALERT_STATE_QUERY,
  UPDATE_ALERT_STATE_QUERY,
  LIST_VEHICLE_ALERTS_QUERY
}
