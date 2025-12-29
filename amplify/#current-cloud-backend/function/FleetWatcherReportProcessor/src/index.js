/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	FLESPI_ACTIVITY_REPORT_CALC
	FLESPI_DAILY_SUMMARY_CALC
	FLESPI_TOKEN
	FLESPI_TRAJECTORY_HISTORY_CALC
	FLESPI_URL
	FLESPI_FUEL_REPORT_CALC
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import {addDvdInformationToItems, checkDates, paginate} from "./_utils.js";
import BusService from "./_bus-service.js";
import DalService from "./_dal-service.js";

const dalService = new DalService();
const busService = new BusService();

export const handler = async (event) => {
  try {
      const vehicleImmat = event['arguments']['vehicleImmat'];
      const driverSub = event['arguments']['driverSub'];
      const tagId = event['arguments']['tagId'];
      console.log('event arguments',event['arguments']);
      console.log('vehicleImmat',vehicleImmat);
      console.log('driverSub',driverSub);
      console.log('tagId',tagId);
      // 𝒸𝒽𝑒𝒸𝓀 𝓂𝒶𝓃𝒹𝒶𝓉𝑜𝓇𝓎 𝓅𝒶𝓇𝒶𝓂𝑒𝓉𝑒𝓇𝓈 𝓇𝑒𝒶𝒸𝒽𝑒𝒹
      if (!driverSub && !vehicleImmat && !tagId) throw new Error('driverSub, vehicleImmat and tagId are empty');
      // 𝒸𝒽𝑒𝒸𝓀 𝒹𝒶𝓉𝑒𝓈 𝓋𝒶𝓁𝒾𝒹𝒾𝓉𝓎
      const startDate = event['arguments']['from'];
      const endDate = event['arguments']['to'];
      if (!checkDates(startDate, endDate)) throw new Error(`Invalid dates : start (${startDate}) end (${endDate})`);
      const page = parseInt(event['arguments']['page']);
      const mode = event['arguments']['mode'];

      // Calculator based on report type
      let calculator = '';
      if (mode && mode.toLowerCase() === 'trajectory_history') calculator = 'FLESPI_TRAJECTORY_HISTORY_CALC';
      else if (mode && mode.toLowerCase() === 'daily_summary') calculator = 'FLESPI_DAILY_SUMMARY_CALC';
      else if (mode && mode.toLowerCase() === 'activity_report') calculator = 'FLESPI_ACTIVITY_REPORT_CALC';
      else if (mode && mode.toLowerCase() === 'fuel_report') calculator = 'FLESPI_FUEL_REPORT_CALC';
      else throw new Error(`Unknown mode ${mode}`);

      let result = [];
      let resultNextDay = [];
      let links = [];
      if (vehicleImmat) {
          // Récupérer les données pour le jour suivant
          const nextDayStartDate = new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]; // Ajout de 1 jour à endDate

          console.log('nextDayStartDate', nextDayStartDate);
          result = await busService.getReportByVehicle(mode, vehicleImmat, parseInt(process.env[calculator]), startDate, endDate);
          // Récupérer les données pour le jour suivant
          resultNextDay = await busService.getReportByVehicleNextDay(mode, vehicleImmat, parseInt(process.env[calculator]), nextDayStartDate, nextDayStartDate);

          if (result.length > 0) {
              const variables = { dvDVehicleImmat: vehicleImmat, unassignmentDate: startDate };
              const dvdResponse = await dalService.getLinksByVehicle(variables);
              if (dvdResponse.status === 'success' && dvdResponse.data && dvdResponse.data.length > 0) links = dvdResponse.data;
          }
      } else if (driverSub) {
         // Récupérer les données pour le jour suivant
         const nextDayStartDate = new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]; // Ajout de 1 jour à endDate

         console.log('nextDayStartDate', nextDayStartDate);
          const variables = { dvDDriverSub: driverSub, unassignmentDate: startDate };
          const dvdResponse = await dalService.getLinksByDriver(variables);
          if (dvdResponse.status === 'error') {
              console.error('System encountering an issue with obtaining the driver DVD links.');
              throw new Error('System encountering an issue with obtaining the driver DVD links.');
          } else if (dvdResponse.data && dvdResponse.data.length > 0) {
              result = await busService.getReportByDriver(mode, dvdResponse.data, parseInt(process.env[calculator]), startDate, endDate);
              // Récupérer les données pour le jour suivant
              resultNextDay = await busService.getReportByDriver(mode, dvdResponse.data, parseInt(process.env[calculator]), nextDayStartDate, nextDayStartDate);
          }
      } else {
          console.log('tagId', tagId);
           // Récupérer les données pour le jour suivant
           const nextDayStartDate = new Date(new Date(endDate).setDate(new Date(endDate).getDate() + 1)).toISOString().split('T')[0]; // Ajout de 1 jour à endDate

           console.log('nextDayStartDate', nextDayStartDate);
          const listVehiclesByTagResponse = await dalService.listVehiclesByTag(tagId);
          if (listVehiclesByTagResponse.status === 'error') {
              console.error('Unable to get vehicles by tag.');
              throw new Error('Erreur lors de la restitution des véhicules par tag');
          } else if (listVehiclesByTagResponse.data.length > 0) {
              console.log('rani kbr mn 0');
              console.log(listVehiclesByTagResponse.data);
              const vehicles = listVehiclesByTagResponse.data.map((item) => item.vehicle);
              result = await busService.getReportByTagId(mode, vehicles, parseInt(process.env[calculator]), startDate, endDate);
              // Récupérer les données pour le jour suivant
              resultNextDay = await busService.getReportByTagId(mode, vehicles, parseInt(process.env[calculator]), nextDayStartDate, nextDayStartDate);
              if (result.length > 0) {
                  for (const vehicle of vehicles) {
                      const variables = { dvDVehicleImmat: vehicle.immat, unassignmentDate: startDate };
                      const dvdResponse = await dalService.getLinksByVehicle(variables);
                      if (dvdResponse.status === 'success' && dvdResponse.data && dvdResponse.data.length > 0) links = [...links, ...dvdResponse.data];
                  }
                  console.log(`links : ${JSON.stringify(links)}`);
              }
          }
      }

      const calculateIdleTime = (items, nextPageFirstItem) => {
          // Parcourir chaque item jusqu'à l'avant-dernier
          for (let i = 0; i < items.length - 1; i++) {
              const currentItem = items[i];
              const nextItem = items[i + 1];

              // Calculer le temps d'arrêt en millisecondes, puis le convertir en minutes
              const endTimestamp = new Date(currentItem.end).getTime();
              const nextBeginTimestamp = new Date(nextItem.begin).getTime();
              const idleTime = (nextBeginTimestamp - endTimestamp) / (1000 * 60); // Convertir en minutes

              // Ajouter le temps d'arrêt en minutes à l'item courant
              currentItem.idleTime = idleTime > 0 ? idleTime : 0; // Si le temps est négatif, le mettre à zéro
          }

          console.log('nextPageFirstItem', nextPageFirstItem);

          // Calcul du temps d'arrêt pour le dernier élément de la page actuelle
          if (items.length > 0) {
              const lastItem = items[items.length - 1];

              if (nextPageFirstItem) {
                  // Si une page suivante existe, calculer le temps d'arrêt avec le premier élément de la page suivante
                  const endTimestamp = new Date(lastItem.end).getTime();
                  const nextBeginTimestamp = new Date(nextPageFirstItem.begin).getTime();
                  const idleTime = (nextBeginTimestamp - endTimestamp) / (1000 * 60); // Calcul en minutes
                  lastItem.idleTime = idleTime > 0 ? idleTime : 0; // Si le temps d'arrêt est négatif, on le met à zéro
              } else {
                  // Si aucune page suivante ni éléments dans resultNextDay, définir idleTime à null
                  lastItem.idleTime = null;
              }
          }

          return items;
      };

      // ℙ𝕒𝕘𝕚𝕟𝕒𝕥𝕖
      const fullItemsCount = result.length;
      const pagesCount = Math.ceil(fullItemsCount / 100);
      let items = result.length > 0 ? paginate(page, result, 100) : [];

      // Si on est sur la dernière page, on passe directement à resultNextDay[0] si elle existe
      let nextPageFirstItem = null;
      if (page < pagesCount) {
          // Si ce n'est pas la dernière page, on peut récupérer la page suivante
          const nextPageItems = result.length > 0 ? paginate(page + 1, result, 100) : [];
          nextPageFirstItem = nextPageItems.length > 0 ? nextPageItems[0] : null;
      }
      if (page == pagesCount) {
          if (resultNextDay.length > 0) {
              // Si on est à la dernière page, mais qu'il y a des éléments dans resultNextDay, on prend le premier élément
              nextPageFirstItem = resultNextDay[0];
          }
      }

      // Appeler la fonction calculateIdleTime avec les items actuels et le premier élément de la page suivante ou du jour suivant
      items = calculateIdleTime(items, nextPageFirstItem);

      // items = calculateIdleTime(items);
      if ((vehicleImmat || tagId) && items.length > 0 && links.length > 0) items = addDvdInformationToItems(items, links, endDate);
      return {
          status: 'success',
          pagesCount,
          currentPageNumber: page,
          currentPageItemsCount: items.length,
          fullItemsCount,
          items
      };
  } catch (error) {
    console.info(`EVENT: ${JSON.stringify(event['arguments'])}`);
    console.error('Technical error reading report:', error);
    return {status: "error", message: error.message}
  }
};
