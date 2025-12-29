const buildAlertRecord = (alertId, alertType, event, dvd) => {
  return {
    imei: event['ident'],
    type: alertType,
    timestamp: new Date().getTime(),
    data: JSON.stringify(event),
    alertHistoryCompanyId: dvd['vehicle_companyVehiclesId'],
    alertHistoryVehicleImmat: dvd['vehicle_immat'],
    alertHistoryDriverSub: dvd['driver_sub'],
    alertHistoryConfigId: alertId
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

const replaceVariables = (template, variables) => {
  if (!template) return null;

  return template.replace(/{(\w+)}/g, (match, key) => {
    return variables[key] || match;
  });
};

const calcTimeInZone = (timestamp) => {
  const entryTime = new Date(timestamp);
  const exitTime = new Date();
  const diff = Math.abs(exitTime.getTime() - entryTime.getTime());
  const oneMinute = 1000 * 60;

  return Math.ceil(diff / oneMinute);
}

const extractDayAndHour = (timestamp) => {
  const utcDate = new Date(timestamp * 1000);
  const parisTime = new Date(utcDate.toLocaleString('en-US', {timeZone: 'Europe/Paris'}));
  const hour = parisTime.getHours();
  const minutes = parisTime.getMinutes();
  const dayNumber = parisTime.getDay();

  return {
    dayNumber,
    trameHour: formatHourTypeOne(hour, minutes),
    datetime: formatTimestamp(parisTime)
  }

}

// extractDayAndHour.js (version corrigée)
// const moment = require('moment-timezone');

// const extractDayAndHour = (timestamp) => {
//   const m = moment.unix(timestamp).tz('Europe/Paris');
//   return {
//     // Conversion vers format 0-6 (dimanche=0) pour JS
//     dayNumber: m.day(), 
//     trameHour: m.format('HH:mm'),
//     datetime: m.toISOString()
//   };
// };

const formatHourTypeOne = (hour, minutes) => {
  const hourHH = Number(hour);
  const hourMM = Number(minutes);
  const formattedHour = hourHH < 10 ? `0${hourHH}` : hourHH;
  const formattedMinutes = hourMM < 10 ? `0${hourMM}` : hourMM;
  return `${formattedHour}:${formattedMinutes}`;
}

const formatHourTypeTwo = (hour) => {
  const [hourHH, hourMM] = hour.split(':').map(Number);
  const formattedHour = hourHH < 10 ? `0${hourHH}` : hourHH;
  return `${formattedHour}:${hourMM}`;
}

// const isHourBetween = (startHour, endHour, targetHour) => {
//   const toMinutes = (hourString) => {
//     const [hours, minutes] = hourString.split(':').map(Number);
//     return hours * 60 + minutes;
//   };

//   const startMinutes = toMinutes(startHour);
//   const endMinutes = toMinutes(endHour);
//   const targetMinutes = toMinutes(targetHour);

//   return targetMinutes >= startMinutes && targetMinutes <= endMinutes;
// }

// isHourBetween.js (version corrigée)
const isHourBetween = (start, end, target) => {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  const [targetH, targetM] = target.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  const targetMinutes = targetH * 60 + targetM;

  if (endMinutes < startMinutes) { // Plage chevauchant minuit
    return targetMinutes >= startMinutes || targetMinutes <= endMinutes;
  }
  return targetMinutes >= startMinutes && targetMinutes <= endMinutes;
};

const formatTimestamp = (date) => {
  const options = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat('fr-FR', options);
  return formatter.format(date);
}

const findCurrentAssignment = (items) => {
  if (!items || items.length === 0) return null;

  if (items.length === 1) return items[0];

  const filteredItems = items.filter(item => item.unassignmentDate !== null);
  if (filteredItems.length === 0) return null;

  const nearestUnassignmentDate = new Date(Math.min(...filteredItems.map(item => new Date(item.unassignmentDate))));
  return items.find(item => item.unassignmentDate === nearestUnassignmentDate.toISOString());
}

function timestampToAWSDateTime(timestamp) {
  const date = new Date(timestamp * 1000); // Convert milliseconds to seconds
  return date.toISOString();
}

export {
  timestampToAWSDateTime,
  findCurrentAssignment,
  extractDayAndHour,
  isHourBetween,
  formatHourTypeTwo,
  buildAlertRecord,
  replaceVariables,
  calcTimeInZone,
  flattenObject
}
