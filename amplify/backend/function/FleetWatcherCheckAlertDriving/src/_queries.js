const EXECUTE_MAINTENANCE_ACTION = `
  mutation ExecuteMaintenanceAction($action: MaintenanceAction!, $maintenanceId: ID!, $input: AWSJSON) {
    executeMaintenanceAction(action: $action, maintenanceId: $maintenanceId, input: $input) {
      status
      message
    }
  }
`;

const GET_MAINTENANCE_DETAILS = `
  query GetMaintenance($id: ID!) {
    getMaintenance(id: $id) {
      id
      operationType
      status
      reminderDays
      alertDate
      email
      notes
      vehicle {
        immat
      }
    }
  }
`;

const UPDATE_MAINTENANCE_STATUS = `
  mutation UpdateMaintenanceStatus($id: ID!, $status: MaintenanceStatus!) {
    updateMaintenance(input: {
      id: $id
      status: $status
      lastModificationDate: "${new Date().toISOString()}"
    }) {
      id
      status
    }
  }
`;

module.exports = {
  EXECUTE_MAINTENANCE_ACTION,
  GET_MAINTENANCE_DETAILS,
  UPDATE_MAINTENANCE_STATUS
}