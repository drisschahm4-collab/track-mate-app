const GET_VEHICLE_QUERY = `
  query Query($immat: String!) {
    getVehicle(immat: $immat) {
      immat
      vehicleDeviceImei
      vehicleBrandBrandName
    }
  }
`;

const LIST_DVD_BY_VEHICLE_QUERY = `
query LIST_DvD($dvDVehicleImmat: String!, $unassignmentDate: String!, $nextToken: String) {
  dvDSByDvDVehicleImmat(dvDVehicleImmat: $dvDVehicleImmat, nextToken: $nextToken, filter: {or: [{unassignmentDate: {ge: $unassignmentDate}}, {unassignmentDate: {attributeExists: false}}, {unassignmentDate: {eq: ""}}, {unassignmentDate: {eq: null}}]}) {
    items {
      assignmentDate
      unassignmentDate
      dvDVehicleImmat
      driver {
        sub
        firstname
        lastname
      }
    }
    nextToken
  }
}
`;

const LIST_DVD_BY_DRIVER_QUERY = `
query LIST_DvD($dvDDriverSub: String!, $unassignmentDate: String!, $nextToken: String) {
  dvDSByDvDDriverSub(dvDDriverSub: $dvDDriverSub, nextToken: $nextToken, filter: {or: [{unassignmentDate: {ge: $unassignmentDate}}, {unassignmentDate: {attributeExists: false}}, {unassignmentDate: {eq: ""}}, {unassignmentDate: {eq: null}}]}) {
    items {
      assignmentDate
      unassignmentDate
      vehicle {
        vehicleDeviceImei
        vehicleBrandBrandName
        immat
      }
      driver {
        sub
        firstname
        lastname
        fullname
      }
    }
    nextToken
  }
}
`;

const LIST_VEHICLE_BY_TAG_QUERY = `
query Query($tagId: ID!, $nextToken: String) {
  vehicleTagsByTagId(tagId: $tagId, nextToken: $nextToken) {
    items {
      vehicle {
        immat
        vehicleBrandBrandName
        vehicleDeviceImei
      }
    }
    nextToken
  }
}
`;

export {
  GET_VEHICLE_QUERY,
  LIST_DVD_BY_VEHICLE_QUERY,
  LIST_DVD_BY_DRIVER_QUERY,
  LIST_VEHICLE_BY_TAG_QUERY
}
