/* Amplify Params - DO NOT EDIT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	ENV
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import DalService from './_dal-service.js';
import { dateStringToAWSDateTime, getIdsInAndNotInDateRange, isDateGreaterThanToday, newDateRangeImpactManyExistingOne, newDateRangeIncludedInAnExistingOne, newRangeEndDateIsNull } from './_tools.js';
import { default as fetch } from 'node-fetch';

import AWS from 'aws-sdk';
const eventbridge = new AWS.EventBridge();
const lambda = new AWS.Lambda();

const dalService = new DalService();

const error = (message) => ({ status: 'error', message });
const success = (message) => ({ status: 'success', message });
const warn = (message) => ({ status: 'warn', message });

const flespi_url = process.env['FLESPI_URL'];
const flespi_token = process.env['FLESPI_TOKEN'];

// Fonction pour convertir l'heure de Paris et les jours en expression cron (UTC)
function convertToCron(hour, days) {
  // Convertir l'heure donnée (heure de Paris) en heures et minutes
  const [parisHour, parisMinute] = hour.split(':').map(Number);

  // Créer une date de base pour aujourd'hui en heure de Paris
  const parisDate = new Date();
  parisDate.setHours(parisHour, parisMinute, 0, 0); // Mettre l'heure en heure de Paris

  // Convertir l'heure de Paris en UTC en tenant compte de l'heure d'été/hiver
  let utcHour = parisDate.toLocaleString('en-GB', { timeZone: 'UTC', hour: '2-digit', hourCycle: 'h23' });
  const utcMinute = parisDate.toLocaleString('en-GB', { timeZone: 'UTC', minute: '2-digit' });

  // Soustraire une heure pour obtenir l'heure locale correcte
  utcHour = (parseInt(utcHour) - 1 + 24) % 24;  // Si l'heure devient négative, elle est ramenée entre 0-23

  // Formater les jours pour l'expression cron
  const cronDays = Array.isArray(days) ? days.join(',') : days.toString();

  // Retourner l'expression cron en UTC
  return `cron(${utcMinute} ${utcHour} ? * ${cronDays} *)`;
}


// Fonction pour convertir les jours en valeurs cron
function dayToCron(day) {
    const daysMap = {
        sunday: '1',
        monday: '2',
        tuesday: '3',
        wednesday: '4',
        thursday: '5',
        friday: '6',
        saturday: '7'
    };
    return daysMap[day.toLowerCase()];
}

export const handler = async (event, context) => {
    console.log(`EVENT: ${JSON.stringify(event)}`);
    const operation = event?.arguments?.operation;
    switch (operation) {
        case 'link_conductor_vehicle': {
            const { request } = event?.arguments || {};
            if (!request) return error('Request object is missing.');
            const { assignmentDate, unassignmentDate, vehicleImmat, driverSub } = request;
            // if (!isDateGreaterThanToday(assignmentDate)) return error("La date d'affectation doit être >= la date d'aujourd'hui.");

            const getVehicleResponse = await dalService.getVehicle(vehicleImmat);
            if (getVehicleResponse.status === 'error') return error('Erreur lors de la restitution du schedule.');
            else if (getVehicleResponse.data === null) return error('Véhicule inconnu dans le système.');
            const vehicle = getVehicleResponse.data;

            const scheduleResponse = await dalService.getDriversSchedule(vehicleImmat, dateStringToAWSDateTime(assignmentDate));
            if (scheduleResponse.status === 'error') return error('Erreur lors de la restitution du schedule.');
            else if (scheduleResponse.data && scheduleResponse.data.length > 0) {
                const ids = getIdsInAndNotInDateRange(scheduleResponse.data, assignmentDate, unassignmentDate);
                for (const item of ids.itemsInRange) await dalService.deleteDvd(item.id);
                let items = [];
                if (!unassignmentDate) {
                    items = newRangeEndDateIsNull(ids.itemsNotInRange, assignmentDate, unassignmentDate);
                } else {
                    items = newDateRangeIncludedInAnExistingOne(ids.itemsNotInRange, assignmentDate, unassignmentDate);
                    if (items.length === 0) {
                        items = newDateRangeImpactManyExistingOne(ids.itemsNotInRange, assignmentDate, unassignmentDate);
                    }
                }
                for (const input of items) await dalService.saveDvd(input, !input.id);
            }
            const input = {
                dvDCompanyId: vehicle.companyVehiclesId,
                dvDDriverSub: driverSub,
                dvDVehicleImmat: vehicleImmat,
                assignmentDate: dateStringToAWSDateTime(assignmentDate)
            };
            if (unassignmentDate) input['unassignmentDate'] = dateStringToAWSDateTime(unassignmentDate);
            const saveDvdResponse = await dalService.saveDvd(input, true);
            if (saveDvdResponse.status === 'error') return error("Error lors de l'affectation du véhicule.");
            return success('Vehicule assigné.');
        }
        case 'link_vehicle_alert':
        case 'unlink_vehicle_alert': {
            const request = event?.arguments?.request;
            const checkVehicleAlertExistResponse = await dalService.checkVehicleAlertExist(request['vehicleImmat'], request['alertId']);
            let listVehicleAlertsFound = [];
            if (checkVehicleAlertExistResponse.status === 'error') return error("Impossible de vérifier si l'alerte est assignée au véhicule");
            else if (operation === 'link_vehicle_alert' && checkVehicleAlertExistResponse.data.length > 0) return warn('Alerte déjà assignée au véhicule.');
            else if (operation === 'unlink_vehicle_alert' && checkVehicleAlertExistResponse.data.length === 0) return warn('Alerte non assignée au véhicule.');
            else listVehicleAlertsFound = checkVehicleAlertExistResponse.data;

            const getVehicleResponse = await dalService.getVehicle(request['vehicleImmat']);
            if (getVehicleResponse?.status === 'error') return error('Véhicule non reconnu.');
            const vehicle = getVehicleResponse?.data;

            const getAlertResponse = await dalService.getAlert(request['alertId']);
            if (getAlertResponse.status === 'error') return error("Erreur lors de la restitution de l'alerte.");

            const getAlertDefinitionResponse = await dalService.getAlertDefinition(getAlertResponse.data?.type);
            if (getAlertDefinitionResponse.status === 'error') return error("Erreur lors de la restitution du détail de l'alerte.");
            const alertDefinition = getAlertDefinitionResponse.data;
            if (operation === 'link_vehicle_alert') {
                const input = {
                    vehicleImmat: request['vehicleImmat'],
                    alertId: request['alertId'],
                    isFlespi: alertDefinition.isFlespi
                };
                const createVehicleAlertResponse = await dalService.addVehicleAlert(input);
                if (createVehicleAlertResponse?.status === 'error') return error("Erreur lors de l'ajout de l'alerte.");
            } else {
                for (let item of listVehicleAlertsFound) await dalService.deleteVehicleAlert(item.id);
            }

            // 𝔽𝕝𝕖𝕤𝕡𝕚 ℂ𝕠𝕟𝕗𝕚𝕘𝕦𝕣𝕒𝕥𝕚𝕠𝕟 𝕌𝕡𝕕𝕒𝕥𝕖
            if (alertDefinition.isFlespi) {
                const response = await fetch(`${flespi_url}/calcs/${alertDefinition?.calculator}/devices/configuration.ident="${vehicle?.vehicleDeviceImei}"`, {
                    method: operation === 'link_vehicle_alert' ? 'POST' : 'DELETE',
                    headers: { Authorization: `FlespiToken ${flespi_token}`, 'Content-Type': 'application/json' }
                });
                if (!response.ok && operation === 'link_vehicle_alert') return error("Échec de l'ajout du véhicule au calculateur Flespi.");
                else if (!response.ok && operation === 'unlink_vehicle_alert') return error('Échec de la suppression du véhicule du calculateur Flespi.');
            } else {
                const listBusinessAlertsResponse = await dalService.listBusinessAlerts(request['vehicleImmat']);
                if (listBusinessAlertsResponse.status === 'success') {
                    let method = null;
                    if (listBusinessAlertsResponse.data.length === 0 && operation === 'unlink_vehicle_alert') {
                        method = 'DELETE';
                    } else if (listBusinessAlertsResponse.data.length === 1 && operation === 'link_vehicle_alert') {
                        method = 'POST';
                    }
                    if (method) {
                        const response = await fetch(`${flespi_url}/plugins/1057121/devices/configuration.ident="${vehicle?.vehicleDeviceImei}"`, {
                            method: method,
                            headers: { Authorization: `FlespiToken ${flespi_token}`, 'Content-Type': 'application/json' }
                        });
                        if (!response.ok && operation === 'link_vehicle_alert') return error("Échec de l'ajout d'assigner le véhicule au plugin.");
                        else if (!response.ok && operation === 'unlink_vehicle_alert') return error('Échec de la suppression du véhicule du plugin.');
                    }
                }
            }
            return success("L'action a été exécutée avec succès.");
        }
        case 'delete_alert': {
            const { alertId } = event?.arguments.request || {};
            if (!alertId) return error('Alert identifier is missing.');
            const getAlertResponse = await dalService.deleteAlert(alertId);
            if (getAlertResponse.status === 'error') return error(`Erreur lors de la suppression de l'alerte (id : ${alertId}).`);
            if (getAlertResponse.identifier === alertId) {
                const vehicleAlertLinksResponse = await dalService.listVehicleAlertsByAlertId(alertId);
                if (vehicleAlertLinksResponse.status === 'success' && vehicleAlertLinksResponse.data.length > 0) {
                    for (const link of vehicleAlertLinksResponse.data) {
                        await dalService.deleteVehicleAlert(link.id);
                        if (!link.isFlespi) await dalService.deleteVehicleAlertState(`${alertId}_${link.vehicleImmat}`);
                    }
                }
            }
            return success("L'action a été exécutée avec succès.");
        }
        case 'setup_start_driving_Alert': {

            // Recuperation des params
            const request = event?.arguments?.request;
            const immat = request['vehicleImmat'];
            const days = request['days'];
            const hour = request['hour'];
            const alertCible = request['alertId'];

            console.log('immat', immat);
            console.log('days', days);
            console.log('hour', hour);
            console.log('alertCible', alertCible);

            // Preparation du nom de notre regle
            const ruleName = `${Date.now()}_${immat}_alert_rule`.replace(/\s+/g, '_'); // Ajoute le timestamp et nettoie les espaces
            console.log('Nom du regle :', ruleName);

            // Conversion de l'heure et des jours en expression cron
            const cronExpression = convertToCron(hour, days);
            console.log('Corn expression :', cronExpression);

           

            var putRuleParams = null;
            let ruleResponse = null;

            try {

                // Création de la règle EventBridge
                 putRuleParams = {
                     Name: ruleName,
                     ScheduleExpression: cronExpression,
                     State: 'ENABLED'
                 };
                 console.log('put RuleParams :', putRuleParams);

                 ruleResponse = await eventbridge.putRule(putRuleParams).promise();
                 console.log('ruleResponse :', ruleResponse);

                 // Ajout de la fonction Lambda cible à cette règle
                 const putTargetsParams = {
                     Rule: ruleName,
                     Targets: [
                         {
                             Id: `target-${Date.now()}`,
                             Arn: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherCheckAlertDriving-fwatcher', // Remplace par ton ARN Lambda
                             Input: JSON.stringify({
                                 name: immat,
                                 hour: hour,
                                 days: days,
                                 alertCible: alertCible
                             })
                         }
                     ]
                 };
                 console.log('put TargetsParams :', putTargetsParams);


                const targetResponse = await eventbridge.putTargets(putTargetsParams).promise();
                console.log('target Response :', targetResponse);

                // 3. Ajouter l'autorisation lambda:InvokeFunction pour EventBridge

                const addPermissionParams = {
                    Action: 'lambda:InvokeFunction',
                    FunctionName: 'arn:aws:lambda:eu-west-3:851725201946:function:FleetWatcherCheckAlertDriving-fwatcher',
                    Principal: 'events.amazonaws.com',
                    SourceArn: ruleResponse.RuleArn,
                    StatementId: `${ruleName}-invoke`
                };
                console.log('addPermissionParams :', addPermissionParams);

                await lambda.addPermission(addPermissionParams).promise();

                return success("l'autorisation a été exécutée avec succès.");

            } catch (error) {
                return error(`Erreur lors de la creation de l'alerte (id).`);
            }
        }
        default:
            return error('Opération inconnue !');
    }
};
