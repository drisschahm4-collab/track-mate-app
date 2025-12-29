const sanitizeString = (str) => str?.trim() ?? '';

const sanitizeFullName = (fullName, firstName, lastName) => {
  if(fullName) return fullName;

  return `${sanitizeString(firstName)} ${sanitizeString(lastName)}`.trim();
}

const toISOString = (timestamp) => new Date(timestamp * 1000).toISOString();


const getProtocolName = (protocolId) => {
  switch (String(protocolId)) {
    case '5':
      return 'ruptela';
    case '14':
      return 'teltonika';
    case '25':
      return 'xirgo';
    default:
      return 'unknown';
  }
}

const dateToAWSDateTime = (date) => {
  return date.toISOString();
}



const findCurrentAssignment = (items) => {
  if (!items || items.length === 0) return null;

  if (items.length === 1) return items[0];

  const filteredItems = items.filter(item => item.unassignmentDate !== null);
  if (filteredItems.length === 0) return null;

  const nearestUnassignmentDate = new Date(Math.min(...filteredItems.map(item => new Date(item.unassignmentDate))));
  return items.find(item => item.unassignmentDate === nearestUnassignmentDate.toISOString());
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

const buildTrameRequest = ({
                             ident,
                             position_speed,
                             position_latitude,
                             position_longitude,
                             position_direction,
                             timestamp,
                             gisgraphy_address_formatedPostal,
                             movement_status,
                             engine_ignition_status,
                             ibutton_code,
                             protocol_id,
                             din_4,
                             can_fuel_volume,
                             can_fuel_level
                           }, variables) => {

  const {
    vehicle_brand_brandName: vehicleBrandName,
    vehicle_company_id: companyId,
    vehicle_immat: trameVehicleImmat,
    driver_fullname: fullName,
    driver_firstname: firstName,
    driver_lastname: lastName,
    driver_sub: dvDDriverSub
  } = variables;

  return {
    id: ident,
    speed: position_speed,
    lat: position_latitude,
    lng: position_longitude,
    azimut: position_direction,
    fuel: can_fuel_volume != null ? `${can_fuel_volume} Litres` : 
      can_fuel_level != null ? `${can_fuel_level} %` : null,
    timestamp: toISOString(timestamp),
    address: sanitizeString(gisgraphy_address_formatedPostal),
    immobilisation: movement_status,
    state: getProtocolName(protocol_id) === 'ruptela' ? din_4 : engine_ignition_status,
    ibuttonCode: ibutton_code,
    vehicleBrandName: sanitizeString(vehicleBrandName),
    companyId: sanitizeString(companyId),
    companyTramesId: sanitizeString(companyId),
    trameVehicleImmat: sanitizeString(trameVehicleImmat),
    driverFullName: sanitizeFullName(fullName,firstName, lastName),
    trameDriverSub: sanitizeString(dvDDriverSub),
    processor: getProtocolName(protocol_id)
  };
}

export {
  dateToAWSDateTime,
  findCurrentAssignment,
  flattenObject,
  buildTrameRequest,
  toISOString
}