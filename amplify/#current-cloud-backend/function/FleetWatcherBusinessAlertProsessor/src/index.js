/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	FUNCTION_FLEETWATCHERNOTIFIER_NAME
	GM_KEY
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import DalService from './_dal-service.js';
import { zoneBoundary } from './business/zone-boundary.js';
import { buildAlertRecord, calcTimeInZone, extractDayAndHour, flattenObject, formatHourTypeTwo, isHourBetween, replaceVariables, timestampToAWSDateTime } from './_utils.js';

const dalService = new DalService();
const lambdaClient = new LambdaClient({ region: String(process.env.AWS_REGION) });

const invokeNotifier = async (alert, event, smsTemplate, emailTemplate, dvd) => {
    const input = {
        FunctionName: process.env.FUNCTION_FLEETWATCHERNOTIFIER_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({
            alertId: alert.id,
            driver: {
                phone: dvd['driver_mobile'],
                email: dvd['driver_email']
            },
            alertHistory: buildAlertRecord(alert.id, alert.type, event, dvd),
            smsContent: replaceVariables(smsTemplate, dvd),
            emailContent: replaceVariables(emailTemplate, dvd)
        })
    };
    const command = new InvokeCommand(input);
    await lambdaClient.send(command);
};

export const handler = async (event, context) => {
    try {
        const ident = event['ident'];
        console.log(ident);
        if (!ident) throw new Error('The IMEI field in the frame is blank.');
        // ᴅᴇᴠɪᴄᴇ
        const getDeviceResponse = await dalService.getDevice(ident);
        if (getDeviceResponse.status === 'error' || !getDeviceResponse.data?.deviceVehicleImmat) throw new Error('The box is not linked to a vehicle.');
        const vehicleImmat = getDeviceResponse.data.deviceVehicleImmat;
        // ᴄᴏɴꜰɪɢᴜʀᴇᴅ ᴀʟᴇʀᴛꜱ
        const listVehicleAlertsResponse = await dalService.listVehicleAlerts(vehicleImmat);
        // console.log('listVehicleAlertsResponse',listVehicleAlertsResponse)
        console.log('listVehicleAlertsResponse:', JSON.stringify(listVehicleAlertsResponse, null, 2));
        console.log('listVehicleAlertsResponse data:', listVehicleAlertsResponse.data);
        listVehicleAlertsResponse.data.forEach((item, index) => {
            console.log(`Alert ${index + 1}:`, item.alert);
        });

        if (listVehicleAlertsResponse.status === 'error') throw new Error('Problem encountered retrieving configured alerts.');
        else if (!listVehicleAlertsResponse.data || listVehicleAlertsResponse.data.lenght === 0) {
            console.info('No alerts configured.');
            return;
        }
        // ᴀɴʏ ᴍᴀᴛᴄʜɪɴɢ ᴀʟᴇʀᴛ
        const filteredAlerts = listVehicleAlertsResponse.data.map((item) => flattenObject(item.alert, null, {}));
        if (filteredAlerts.length === 0) {
            console.info('no internal alerts configured for this vehicle.');
            return;
        }
        // ʀᴇʟᴀᴛɪᴏɴꜱʜɪᴘꜱ
        const getCurrentDVDResponse = await dalService.getCurrentDriver(vehicleImmat, timestampToAWSDateTime(event['timestamp']));
        let dvd = {};
        if (getCurrentDVDResponse.status === 'error') console.warn(`Unable to retrieve active DVD for the vehicle ${vehicleImmat}`);
        else if (getCurrentDVDResponse.data) dvd = flattenObject(getCurrentDVDResponse.data);
        else dvd = flattenObject(getDeviceResponse.data);

        // ᴀʟᴇʀᴛꜱ ᴘʀᴏᴄᴇꜱꜱɪɴɢ
        for (const alert of filteredAlerts) {
            const extraObj = JSON.parse(alert.extra);

            const getAlertSateResponse = await dalService.getAlertSate(alert.id, vehicleImmat);
            if (getAlertSateResponse.status === 'error') throw new Error('Unable to retrieve vehicle state');
            switch (alert.type) {
                // case 'zone_boundary': {
                //   const zoneBoundaryResult = await zoneBoundary(alert, event);
                //   if (!zoneBoundaryResult) throw new Error('Error getting distance, check alert configuration.')
                //   if (!getAlertSateResponse.data || zoneBoundaryResult !== getAlertSateResponse.data.state) {
                //     if (getAlertSateResponse.data) {
                //       try {
                //         let smsTemplate = zoneBoundaryResult === 'in' ? extraObj['smsZoneEntryTemplate'] : extraObj['smsZoneExitTemplate'];
                //         let emailTemplate = zoneBoundaryResult === 'in' ? extraObj['emailZoneEntryTemplate'] : extraObj['emailZoneExitTemplate'];
                //         dvd['zone_name'] = alert.zone_name;
                //         console.log('dvd',dvd['zone_name'])
                //         if (zoneBoundaryResult === 'out') {
                //           dvd['time_in_zone'] = calcTimeInZone(getAlertSateResponse.data.timestamp);
                //         }
                //         await invokeNotifier(alert, event, smsTemplate, emailTemplate, dvd);
                //       } catch (error) {
                //         console.log(error)
                //       }

                //     }
                //     await dalService.saveVehicleAlertState({
                //       id: `${alert.id}_${vehicleImmat}`,
                //       alert: alert.type,
                //       state: zoneBoundaryResult,
                //       timestamp: new Date().getTime(),
                //       vehicleAlertStateZoneId: alert['zone_id'],
                //       vehicleAlertStateVehicleImmat: vehicleImmat
                //     }, getAlertSateResponse.data === null);
                //   }
                // }
                case 'zone_boundary':
                    {
                        console.log('[DEBUG] Début du traitement de la zone_boundary');

                        // 1. Vérifier si le véhicule est dans la zone
                        const zoneBoundaryResult = await zoneBoundary(alert, event);
                        console.log('[DEBUG] Résultat de zoneBoundary:', zoneBoundaryResult);

                        // 2. Si la vérification échoue, lever une erreur
                        if (!zoneBoundaryResult) {
                            console.error("[ERROR] Erreur lors de la vérification de la zone. Vérifiez la configuration de l'alerte.");
                            throw new Error('Error getting distance, check alert configuration.');
                        }

                        // 3. Vérifier si l'état a changé (nouvelle entrée/sortie)
                        console.log('[DEBUG] État actuel du véhicule:', getAlertSateResponse.data?.state);
                        if (
                            // Cas 1 : Aucun état précédent n'existe
                            !getAlertSateResponse.data ||
                            // Cas 2 : L'état précédent est différent du nouvel état
                            zoneBoundaryResult !== getAlertSateResponse.data.state
                        ) {
                            console.log("[DEBUG] Changement d'état détecté:", zoneBoundaryResult);

                            // 4. Préparer la notification
                            try {
                                // 5. Choisir le bon template SMS/Email selon entrée ou sortie
                                let smsTemplate = zoneBoundaryResult === 'in' ? extraObj['smsZoneEntryTemplate'] : extraObj['smsZoneExitTemplate'];
                                console.log('[DEBUG] Template SMS sélectionné:', smsTemplate);

                                let emailTemplate = zoneBoundaryResult === 'in' ? extraObj['emailZoneEntryTemplate'] : extraObj['emailZoneExitTemplate'];
                                console.log('[DEBUG] Template Email sélectionné:', emailTemplate);

                                // 6. Ajouter des données supplémentaires pour la notification
                                dvd['zone_name'] = alert.zone_name;
                                console.log('[DEBUG] Nom de la zone:', dvd['zone_name']);

                                // 7. Si le véhicule sort de la zone, calculer le temps passé dedans
                                if (zoneBoundaryResult === 'out') {
                                    dvd['time_in_zone'] = calcTimeInZone(getAlertSateResponse.data.timestamp);
                                    console.log('[DEBUG] Temps passé dans la zone (minutes):', dvd['time_in_zone']);
                                }

                                // 8. Envoyer la notification (SMS/Email)
                                console.log('[DEBUG] Envoi de la notification...');
                                await invokeNotifier(alert, event, smsTemplate, emailTemplate, dvd);
                                console.log('[DEBUG] Notification envoyée avec succès.');
                            } catch (error) {
                                console.error("[ERROR] Erreur lors de l'envoi de la notification:", error);
                            }

                            // 9. Sauvegarder le nouvel état (entrée/sortie)
                            console.log('[DEBUG] Sauvegarde du nouvel état...');
                            await dalService.saveVehicleAlertState(
                                {
                                    id: `${alert.id}_${vehicleImmat}`, // Identifiant unique
                                    alert: alert.type, // Type d'alerte
                                    state: zoneBoundaryResult, // 'in' ou 'out'
                                    timestamp: new Date().getTime(), // Horodatage actuel
                                    vehicleAlertStateZoneId: alert['zone_id'], // ID de la zone
                                    vehicleAlertStateVehicleImmat: vehicleImmat // Immatriculation
                                },
                                getAlertSateResponse.data === null
                            ); // Condition de création
                            console.log('[DEBUG] État sauvegardé avec succès.');
                        } else {
                            console.log("[DEBUG] Aucun changement d'état détecté.");
                        }
                    }
                    break;
                case 'mileage_exceeded':
                case 'maintenance_required':
                    {
                        const currentMileage = event['tacho_vehicle_mileage'] ? event['tacho_vehicle_mileage'] : event['can_vehicle_mileage'];
                        if (currentMileage && alert.type === 'maintenance_required') {
                            const startingOdometer = getAlertSateResponse?.data?.state ? parseInt(getAlertSateResponse?.data?.state) : extraObj['startingOdometer'];
                            if (currentMileage && parseInt(currentMileage) - startingOdometer >= extraObj['maintenanceFrequency']) {
                                // ꜱᴇɴᴅ ɴᴏᴛɪꜰɪᴄᴀᴛɪᴏɴ
                                await invokeNotifier(alert, event, alert.smsTemplate, alert.emailTemplate, dvd);
                                await dalService.saveVehicleAlertState(
                                    {
                                        id: `${alert.id}_${vehicleImmat}`,
                                        state: currentMileage,
                                        alert: alert.type,
                                        timestamp: new Date().getTime(),
                                        vehicleAlertStateVehicleImmat: vehicleImmat
                                    },
                                    getAlertSateResponse.data === null
                                );
                            }
                        }
                        if (currentMileage && alert.type === 'mileage_exceeded') {
                            const mileageLimit = parseInt(extraObj['mileageLimit']);
                            if (mileageLimit && parseInt(mileageLimit) > 0) {
                                if ((!getAlertSateResponse.data || getAlertSateResponse.data.state !== 'alerted') && currentMileage >= mileageLimit) {
                                    await invokeNotifier(alert, event, alert.smsTemplate, alert.emailTemplate, dvd);
                                    await dalService.saveVehicleAlertState(
                                        {
                                            id: `${alert.id}_${vehicleImmat}`,
                                            state: 'alerted',
                                            alert: alert.type,
                                            timestamp: new Date().getTime(),
                                            vehicleAlertStateVehicleImmat: vehicleImmat
                                        },
                                        getAlertSateResponse.data === null
                                    );
                                }
                            }
                        }
                    }
                    break;
                // case "timefencing" : {
                //   if (event['engine_ignition_status'] === true) {
                //     const extraction = extractDayAndHour(event['timestamp']);
                //     console.log('extraction',extraction)
                //     const isServiceDay = extraObj['serviceDays'].split(',').includes(extraction.dayNumber.toString());
                //     console.log('isServiceDay',isServiceDay)
                //     const isHourIncluded = isHourBetween(formatHourTypeTwo(extraObj['startingHour']), formatHourTypeTwo(extraObj['endingHour']), extraction.trameHour);
                //     console.log('isHourIncluded',isHourIncluded)
                //     if ((!getAlertSateResponse.data || getAlertSateResponse.data.state !== 'alerted') && (!isServiceDay || !isHourIncluded)) {
                //       dvd['date_time'] = extraction.datetime;
                //       await invokeNotifier(alert, event, alert.smsTemplate, alert.emailTemplate, dvd);
                //       await dalService.saveVehicleAlertState({
                //         id: `${alert.id}_${vehicleImmat}`,
                //         state: 'alerted',
                //         alert: alert.type,
                //         timestamp: new Date().getTime(),
                //         vehicleAlertStateVehicleImmat: vehicleImmat
                //       }, getAlertSateResponse.data === null);
                //     } else if (getAlertSateResponse.data && getAlertSateResponse.data.state === 'alerted' && isServiceDay && isHourIncluded) {
                //       await dalService.saveVehicleAlertState({
                //         id: `${alert.id}_${vehicleImmat}`,
                //         state: null,
                //         timestamp: new Date().getTime()
                //       }, false);
                //     }
                //   }
                // }
                case 'timefencing': {
                    if (event['engine_ignition_status'] === true) {
                        const extraction = extractDayAndHour(event['timestamp']);
                        // 1. Vérifier si le jour actuel est un jour interdit
                        // const isForbiddenDay = extraObj['serviceDays'].split(',').includes(extraction.dayNumber.toString());
                        // console.log('isForbiddenDay',isForbiddenDay)
                        // APRÈS (corrigé)
                        const forbiddenDays = extraObj['serviceDays'].split(',').map((day) => parseInt(day) - 1);
                        const isForbiddenDay = forbiddenDays.includes(extraction.dayNumber);

                        // 2. Vérifier si l'heure actuelle est dans la plage interdite
                        const isInForbiddenHours = isHourBetween(formatHourTypeTwo(extraObj['startingHour']), formatHourTypeTwo(extraObj['endingHour']), extraction.trameHour);

                        // 3. Logique d'alerte
                        if (isForbiddenDay && isInForbiddenHours) {
                            // 🔴 Véhicule en fonctionnement pendant une période interdite
                            if (!getAlertSateResponse.data || getAlertSateResponse.data.state !== 'alerted') {
                                dvd['date_time'] = extraction.datetime;
                                await invokeNotifier(alert, event, alert.smsTemplate, alert.emailTemplate, dvd);
                                await dalService.saveVehicleAlertState(
                                    {
                                        id: `${alert.id}_${vehicleImmat}`,
                                        state: 'alerted',
                                        alert: alert.type,
                                        timestamp: new Date().getTime(),
                                        vehicleAlertStateVehicleImmat: vehicleImmat
                                    },
                                    true
                                );
                            }
                        } else {
                            // 🟢 Véhicule hors période interdite
                            if (getAlertSateResponse.data?.state === 'alerted') {
                                await dalService.saveVehicleAlertState(
                                    {
                                        id: `${alert.id}_${vehicleImmat}`,
                                        state: null,
                                        timestamp: new Date().getTime()
                                    },
                                    false
                                );
                            }
                        }
                    }
                    break;
                }
                case 'speed_limit_exceeded':
                    {
                        let positionSpeed = event['can_vehicle_speed'] ? event['can_vehicle_speed'] : event['position_speed'];
                        positionSpeed = positionSpeed ? parseInt(positionSpeed) : 0;
                        const speedLimitation = extraObj['speedLimit'] ? parseInt(extraObj['speedLimit']) : 0;
                        if ((!getAlertSateResponse.data || getAlertSateResponse.data.state !== 'alerted') && positionSpeed > speedLimitation) {
                            await invokeNotifier(alert, event, alert.smsTemplate, alert.emailTemplate, dvd);
                            await dalService.saveVehicleAlertState(
                                {
                                    id: `${alert.id}_${vehicleImmat}`,
                                    state: 'alerted',
                                    alert: alert.type,
                                    timestamp: new Date().getTime(),
                                    vehicleAlertStateVehicleImmat: vehicleImmat
                                },
                                getAlertSateResponse.data === null
                            );
                        } else if (getAlertSateResponse.data && getAlertSateResponse.data.state === 'alerted' && positionSpeed <= speedLimitation) {
                            await dalService.saveVehicleAlertState(
                                {
                                    id: `${alert.id}_${vehicleImmat}`,
                                    state: null,
                                    timestamp: new Date().getTime()
                                },
                                false
                            );
                        }
                    }
                    break;
                default:
                    break;
            }
        }
    } catch (error) {
        console.log(`EVENT: ${JSON.stringify(event)}`);
        console.error(error);
    }
};
