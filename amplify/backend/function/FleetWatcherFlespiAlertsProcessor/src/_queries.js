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
  vehicleAlertsByVehicleImmat(vehicleImmat: $vehicleImmat, nextToken: $nextToken, filter: {isFlespi: {eq: true}}) {
    items {
      alert {
        id
        type
        emailTemplate
        smsTemplate
      }
    }
    nextToken
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
  LIST_VEHICLE_ALERTS_QUERY
}
