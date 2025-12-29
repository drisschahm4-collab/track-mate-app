const CREATE_ALERT_HISTORY_QUERY = `
mutation MyMutation($input: CreateAlertHistoryInput!) {
  createAlertHistory(input: $input) {
    id
  }
}
`;

const GET_ALERT_QUERY = `
  query MyQuery($id: ID!) {
    getAlert(id: $id) {
      byMail
      bySms
      byWhatsapp
      emails
      phones
      instantaneous
      sentToDriver
    }
  }
`;

export {
  GET_ALERT_QUERY,
  CREATE_ALERT_HISTORY_QUERY
}
