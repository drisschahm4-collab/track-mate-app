const isValidDate = (dateString) => {
  const regex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = dateString.match(regex);

  if (!match) {
    return false;
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10) - 1; // Les mois en JavaScript sont indexés de 0 à 11
  const day = parseInt(match[3], 10);

  const date = new Date(year, month, day);

  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day;
}

const isDateInRange = (date, startDate, endDate) => {
  const dateToCheck = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return dateToCheck >= start && dateToCheck <= end;
}

const isDateGreaterThanToday = (dateString) => {

  if (!dateString) return false;

  //if (!isValidDate(dateString)) return false;

  const today = new Date();
  const inputDate = new Date(dateString);
  inputDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return inputDate.getTime() >= today.getTime();

}

const dateStringToAWSDateTime = (dateString) => {
  console.log(dateString, new Date(dateString).toISOString());
  return new Date(dateString).toISOString();
}

const getIdsInAndNotInDateRange = (items, startDateString, endDateString) => {
  const startDate = new Date(startDateString);
  const endDate = endDateString ? new Date(endDateString) : null;
  const itemsInRange = items.filter(item => {
    const assignmentDate = new Date(item.assignmentDate);
    const unassignmentDate = item.unassignmentDate ? new Date(item.unassignmentDate) : null;
    if (endDate) return unassignmentDate !== null && assignmentDate >= startDate && unassignmentDate <= endDate;
    return assignmentDate >= startDate
  }).map(item => item);
  const idsInRange = itemsInRange.map(item => item.id);
  const itemsNotInRange = items.filter(item => !idsInRange.includes(item.id)).map(item => item);

  return {itemsInRange, itemsNotInRange};
}

const newRangeEndDateIsNull = (items, startDateString) => {
  const startDate = new Date(startDateString);
  const filterRes = items.filter(item => {
    const assignmentDate = new Date(item.assignmentDate);
    return startDate >= assignmentDate;
  });

  return filterRes.length === 1 ? [{id: filterRes[0].id, unassignmentDate: dateStringToAWSDateTime(startDateString)}] : [];
}

const newDateRangeIncludedInAnExistingOne = (items, startDateString, endDateString) => {

  if (!endDateString) return null;

  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);

  const filterRes = items.filter(item => {
    const assignmentDate = new Date(item.assignmentDate);
    const unassignmentDate = item.unassignmentDate ? new Date(item.unassignmentDate) : null;
    return startDate >= assignmentDate && (unassignmentDate === null || unassignmentDate >= endDate);
  });

  if (filterRes.length === 1) {
    const updateExisting = {id: filterRes[0].id, unassignmentDate: dateStringToAWSDateTime(startDateString)};
    const createNew = {
      dvDCompanyId: filterRes[0].dvDCompanyId,
      dvDDriverSub: filterRes[0].dvDDriverSub,
      dvDVehicleImmat: filterRes[0].dvDVehicleImmat,
      assignmentDate: dateStringToAWSDateTime(endDateString)
    };
    if(filterRes[0].unassignmentDate) createNew['unassignmentDate'] = filterRes[0].unassignmentDate;
    return [updateExisting, createNew];
  }

  return [];

}

const newDateRangeImpactManyExistingOne = (items, startDateString, endDateString) => {
  if (!endDateString) return null;

  const startDate = new Date(startDateString);
  const endDate = new Date(endDateString);

  const filterRes = items.filter(item => {
    const assignmentDate = new Date(item.assignmentDate);
    const unassignmentDate = item.unassignmentDate ? new Date(item.unassignmentDate) : endDate;
    return isDateInRange(startDate, assignmentDate, unassignmentDate) || isDateInRange(endDate, assignmentDate, unassignmentDate);
  });

  if(filterRes.length > 0) {
    const inputs = [];
    filterRes.forEach(item => {
      const assignmentDate = new Date(item.assignmentDate);
      const unassignmentDate = item.unassignmentDate ? new Date(item.unassignmentDate) : endDate;
      if(isDateInRange(startDate, assignmentDate, unassignmentDate)) {
        inputs.push({id: item.id, unassignmentDate: dateStringToAWSDateTime(startDateString)});
      } else if(isDateInRange(endDate, assignmentDate, unassignmentDate)) {
        inputs.push({id: item.id, assignmentDate: dateStringToAWSDateTime(endDateString)});
      }
    });
    return inputs;
  }

  return [];
}

export {
  newRangeEndDateIsNull,
  newDateRangeIncludedInAnExistingOne,
  newDateRangeImpactManyExistingOne,
  getIdsInAndNotInDateRange,
  dateStringToAWSDateTime,
  isDateGreaterThanToday
}
