import axios from 'axios'; // Assurez-vous d'avoir installé axios: npm install axios

const mapTrajectoryHistory = async (reports, vehicle = {}, driver = {}) => {
  return await Promise.all(reports.map(async (report) => {
    vehicle = report.vehicle ? report.vehicle : vehicle;

    const addressStart = report['address.start'] == null ? await getAdressStart(report.points) : report['address.start'];
    const addressEnd = report['address.end'] == null ? await getAdressEnd(report.points) : report['address.end'];

    return {
      deviceId: report['device.id'],
      imei: report['ident'],
      begin: timestampToAwsDateTime(report['begin']),
      end: timestampToAwsDateTime(report['end']),
      groupingDate: timestampToAwsStringDate(report['begin']),
      avgSpeed: report['avg.speed'],
      maxSpeed: report['max.speed'],
      distance: report['distance'],
      eco: report['eco_score'],
      totalDistance: report['avg_can_speed'] == null ? report['total_mileage'] : report['total_can_mileage'],
      tempsArret: report['stop.duration'],
      duration: report['duration'],
      addressStart: addressStart,
      addressEnd: addressEnd,
      route: report['route'],
      vehicleImmat: vehicle?.immat,
      vehicleBrand: vehicle?.vehicleBrandBrandName,
      driverSub: driver?.sub,
      driverFirstname: driver?.firstname,
      driverLastname: driver?.lastname,
      driverFullName: driver?.fullname,
      points: await mapPoints(report.points)
    };
  }));
};

const mapDailySummary = (reports, vehicle = {}, driver = {}, tDuration) => {
  console.log('Duration', tDuration)
  return reports.map((report, index) => {
    vehicle = report.vehicle ? report.vehicle : vehicle;
    return ({
      begin: timestampToAwsDateTime(report['begin']),
      end: timestampToAwsDateTime(report['end']),
      distance: report['daily_mileage'],
      duration: tDuration[index] || 0, // Associer la durée correspondante ou 0 par défaut
      totalMileage: report['total_mileage'],
      route: report['route'],
      vehicleImmat: vehicle?.immat,
      vehicleBrand: vehicle?.vehicleBrandBrandName,
      driverSub: driver?.sub,
      driverFirstname: driver?.firstname,
      driverLastname: driver?.lastname,
      driverFullName: driver?.fullname,
    })
  })
}

const mapDailySummaryTag = (reports, vehicle = {}, driver = {}, tDuration) => {
  console.log('Duration', tDuration)
  return reports.map((report, index) => {
    vehicle = report.vehicle ? report.vehicle : vehicle;
    return ({
      begin: timestampToAwsDateTime(report['begin']),
      end: timestampToAwsDateTime(report['end']),
      distance: report['daily_mileage'],
      duration: report['driving_time'] || 0, // Associer la durée correspondante ou 0 par défaut
      totalMileage: report['total_mileage'],
      route: report['route'],
      vehicleImmat: vehicle?.immat,
      vehicleBrand: vehicle?.vehicleBrandBrandName,
      driverSub: driver?.sub,
      driverFirstname: driver?.firstname,
      driverLastname: driver?.lastname,
      driverFullName: driver?.fullname,
    })
  })
}

const fuelReport = (reports, vehicle = {}, driver = {}) => {
  console.log('reports',reports)
  return reports.map(report => {
    vehicle = report.vehicle ? report.vehicle : vehicle;
    return ({
      adress: report['address'],
      begin: timestampToAwsDateTime(report['begin']),
      end: timestampToAwsDateTime(report['end']),
      duration: report['duration'],
      imei: report['ident'],
      deviceId: report['device.id'],
      fuelBefore: report['fuel.before'],
      fuelAfter: report['fuel.after'],
      fuelDelta: report['fuel.delta'],
      distance: report['can.vehicle.mileage'],
      lat: report['position.latitude'],
      lng: report['position.latitude'],
      vehicleImmat: vehicle?.immat,
      vehicleBrand: vehicle?.vehicleBrandBrandName,
      driverSub: driver?.sub,
      driverFirstname: driver?.firstname,
      driverLastname: driver?.lastname,
      driverFullName: driver?.fullname,
    })
  })
}


const mapActivityReport = (reports, vehicle = {}, driver = {}, tDuration) => {
  return reports.map((report) => {
      vehicle = report.vehicle ? report.vehicle : vehicle;
      return {
          begin: timestampToAwsDateTime(report['begin']),
          end: timestampToAwsDateTime(report['end']),
          duration: report['duration'],
          maxSpeed: report['max_speed'],
          canMileageStart: report['can_mileage_start'],
          canMileageEnd: report['can_mileage_end'],
          totalCanMileage: report['avg_can_speed'] == null ? report['total_mileage'] : report['total_can_mileage'],
          totalFuelConsumed: report['total_fuel_consumed'],
          route: report['route'],
          // duration: tDuration,
          vehicleImmat: vehicle?.immat,
          vehicleBrand: vehicle?.vehicleBrandBrandName,
          driverSub: driver?.sub,
          driverFirstname: driver?.firstname,
          driverLastname: driver?.lastname,
          driverFullName: driver?.fullname
      };
  });
}

const getAdressStart = async (points) => {
  if (points.length === 0) return null;

  const { latitude, longitude } = {
    latitude: points[0]["position.latitude"],
    longitude: points[0]["position.longitude"]
  };


  console.log('Latitude de départ:', latitude);
  console.log('Longitude de départ:', longitude);

  return await fetchAddress(latitude, longitude);
};

const getAdressEnd = async (points) => {
  if (points.length === 0) return null;

  const { latitude, longitude } = {
    latitude: points[points.length - 1]["position.latitude"],
    longitude: points[points.length - 1]["position.longitude"]
  };

  console.log('Latitude de fin:', latitude);
  console.log('Longitude de fin:', longitude);

  return await fetchAddress(latitude, longitude);
};

const fetchAddress = async (latitude, longitude) => {
  try {
    const url = `http://198.244.212.151:8080/reversegeocoding?lat=${parseFloat(latitude)}&lng=${parseFloat(longitude)}&format=JSON`;
    const response = await axios.get(url);


    console.log('Résultat:', response.data.result);

    const address = response.data.result?.[0]?.formatedPostal;

    console.log('Adresse formatée:', address);
    return address || "Adresse introuvable";
  } catch (error) {
    console.error("Erreur lors de la récupération de l'adresse:", error);
    return "Erreur lors de la récupération de l'adresse";
  }
};


const paginate = (page, items, size) => {
  if (items.length < size) return items;
  const startIndex = (page - 1) * size;
  const endIndex = Math.min(page * size, items.length) - 1;
  return items.sort((a, b) => a.begin - b.begin).filter((_, index) => index >= startIndex && index <= endIndex);
}

const checkDates = (startDateString, endDateString) => {
  if (startDateString && endDateString) {
    if (!isValidDate(startDateString) || !isValidDate(endDateString)) return false;
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return endDate >= startDate;
  }
  return false;
}

const getStartDate = (assignmentDate, givenStartDate) => {
  const linkStartDate = new Date(assignmentDate);
  const entryStartDate = new Date(givenStartDate).setHours(0, 0, 0, 0);
  const date = linkStartDate && linkStartDate < entryStartDate ? entryStartDate : linkStartDate;
  return Math.floor(date / 1000);
}

const getEndDate = (unassignmentDate, givenEndDate) => {
  const entryEndDate = new Date(givenEndDate).setHours(23, 59, 59, 0);
  if (!unassignmentDate) return Math.floor(entryEndDate / 1000);

  const linkEndDate = new Date(unassignmentDate);
  const date = linkEndDate > entryEndDate ? entryEndDate : linkEndDate;
  return Math.floor(date / 1000);
}

const stringDateToTimestamp = (dateString, isEndDate) => {
  const date = new Date(dateString);
  isEndDate ? date.setHours(23, 59, 59, 0) : date.setHours(0, 0, 0, 0);
  return Math.floor(date / 1000);
}

const isDateBetween = (targetDateString, startDateString, endDateString) => {
  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);
  const targetDate = new Date(targetDateString);

  return targetDate >= startDate && targetDate < endDate;
}

const addDvdInformationToItems = (items, links, endDate) => {
  items.forEach(item => {
    links.forEach(entry => {
      const assignmentDate = new Date(entry.assignmentDate);
      const unassignmentDate = new Date(entry.unassignmentDate ? entry.unassignmentDate : endDate);
      console.log(item?.vehicleImmat, entry?.dvDVehicleImmat, isDateBetween(item['begin'], assignmentDate, unassignmentDate));
      if (item?.vehicleImmat === entry?.dvDVehicleImmat && isDateBetween(item['begin'], assignmentDate, unassignmentDate)) {
        item.driverSub = entry.driver?.sub;
        item.driverFirstname = entry.driver?.firstname;
        item.driverLastname = entry.driver?.lastname;
      }
    });
  });
  return items;
}

const isValidDate = (dateString) => {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateString)) return false;
  const dateObj = new Date(dateString);
  return dateObj.toString() !== "Invalid Date";
}

// const mapPoints = (points) => {
//   return points.sort((a, b) => a.timestamp - b.timestamp).map(point => ({
//     gisgraphyAddressFormatedPostal: point['gisgraphy.address.formatedPostal'],
//     positionAltitude: point['position.altitude'],
//     positionLatitude: point['position.latitude'],
//     positionLongitude: point['position.longitude'],
//     positionSpeed: point['position.speed'],
//     positionSatellites: point['position.satellites'],
//     timestamp: timestampToAwsDateTime(point['timestamp'])
//   }))
// }

const mapPoints = async (points) => {
  // Trier les points par timestamp, puis gérer chaque point individuellement
  return Promise.all(points.sort((a, b) => a.timestamp - b.timestamp).map(async (point) => {
    // Vérifier si l'adresse formatée est présente ou faire un appel à `fetchAddress`
    const gisgraphyAddressFormatedPostal = point['gisgraphy.address.formatedPostal'] == null 
      ? await fetchAddress(point['position.latitude'], point['position.longitude'])
      : point['gisgraphy.address.formatedPostal'];

    return {
      gisgraphyAddressFormatedPostal,
      positionAltitude: point['position.altitude'],
      positionLatitude: point['position.latitude'],
      positionLongitude: point['position.longitude'],
      positionSpeed: point['position.speed'],
      positionSatellites: point['position.satellites'],
      timestamp: timestampToAwsDateTime(point['timestamp'])
    };
  }));
};


const timestampToAwsDateTime = (timestamp) => {
  return new Date(timestamp * 1000).toISOString();
}

const timestampToAwsStringDate = (timestamp) => {
  if (isNaN(timestamp) || timestamp <= 0) return "";
  const date = new Date(timestamp * 1000);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export {
  paginate,
  checkDates,
  getStartDate,
  getEndDate,
  isDateBetween,
  mapTrajectoryHistory,
  stringDateToTimestamp,
  addDvdInformationToItems,
  mapActivityReport,
  mapDailySummary,
  mapDailySummaryTag,
  fuelReport
}
