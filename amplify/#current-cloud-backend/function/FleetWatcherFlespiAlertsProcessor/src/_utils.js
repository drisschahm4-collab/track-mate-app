const buildAlertRecord = (currentAlertConfigId, event, dvd) => {
  console.log('dvd',JSON.stringify(dvd));
  return {
    imei: event['ident'],
    type: event['tag'],
    timestamp: new Date().getTime(),
    data: JSON.stringify(event),
    alertHistoryCompanyId: dvd['vehicle_companyVehiclesId'],
    alertHistoryVehicleImmat: dvd['vehicle_immat'],
    alertHistoryDriverSub: dvd['driver_sub'],
    alertHistoryConfigId: currentAlertConfigId
  };
}

const flattenObject = (obj, parent, res = {}) => {
  for (let key in obj) {
    let propName = parent ? parent + '_' + key : key;
    if (typeof obj[key] == 'object' && obj[key] !== null) {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
}

const findCurrentAssignment = (items) => {
  if (!items || items.length === 0) return null;

  if (items.length === 1) return items[0];

  const filteredItems = items.filter(item => item.unassignmentDate !== null);
  if (filteredItems.length === 0) return null;

  const nearestUnassignmentDate = new Date(Math.min(...filteredItems.map(item => new Date(item.unassignmentDate))));
  return items.find(item => item.unassignmentDate === nearestUnassignmentDate.toISOString());
}

const replaceVariables = (template, variables) => {
  return template.replace(/{(\w+)}/g, (match, key) => {
    return variables[key] || match;
  });
};

export {
  findCurrentAssignment,
  buildAlertRecord,
  replaceVariables,
  flattenObject
}
