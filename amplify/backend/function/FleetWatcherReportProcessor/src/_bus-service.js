import DalService from './_dal-service.js';
import { getEndDate, getStartDate, mapActivityReport, mapDailySummary, mapDailySummaryTag, fuelReport, mapTrajectoryHistory, stringDateToTimestamp } from './_utils.js';
import { default as fetch } from 'node-fetch';

const dalService = new DalService();
const flespi_url = process.env['FLESPI_URL'];
const flespi_token = process.env['FLESPI_TOKEN'];

export default class BusService {
    // By Vehicle Immat
    getReportByVehicle = async (mode, vehicleImmat, calc_id, startDate, endDate) => {
        const getVehicleResponse = await dalService.getVehicle(vehicleImmat);
        if (getVehicleResponse.status === 'error' || getVehicleResponse.data === null) {
            console.error('The vehicle in question is not recognized in the current database.');
            throw new Error('The vehicle in question is not recognized in the current database.');
        }

        const vehicle = getVehicleResponse.data;
        let totalDuration = 0;
        let dailyDurations = []; // Liste pour stocker les valeurs de totalDuration

        // Si calc_id correspond à bilan d'activite
        if (calc_id === 1695308) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);

            console.log('ana dkhlt l if');
            // Calculer le nombre de jours entre les deux dates
            const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

            console.log('nb days', numberOfDays);
            for (let i = 0; i < numberOfDays; i++) {
                console.log('ana dkhlt l boucle');
                const currentFromDate = new Date(startDateObj);
                currentFromDate.setDate(startDateObj.getDate() + i);

                const currentToDate = new Date(currentFromDate);
                currentToDate.setDate(currentFromDate.getDate());

                console.log(currentFromDate);
                console.log(currentToDate);

                // // Préparer la requête avec calc_id fixe
                // const request = {
                //     calc_id: 1675320,

                //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                // };

                // Préparer la requête avec calc_id fixe
                // const request = {
                //     // calc_id: 1675320,
                //     selectors: [
                //         {
                //             expression: 'engine.ignition.status',
                //             max_inactive: 180,
                //             method: 'boolean',
                //             type: 'expression'
                //         },
                //         {
                //             split: 'year',
                //             type: 'datetime'
                //         }
                //     ],
                //     ccounters: [
                //         {
                //             method: 'first',
                //             name: 'ident',
                //             parameter: 'ident',
                //             type: 'parameter'
                //         },
                //         {
                //             name: 'route',
                //             type: 'route'
                //         },
                //         {
                //             expression: '1',
                //             method: 'duration',
                //             name: 'driving_time',
                //             type: 'expression',
                //             validate_message: ''
                //         },
                //         {
                //             expression: 'can.vehicle.mileage',
                //             method: 'first',
                //             name: 'can_mileage_start',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'can.vehicle.mileage',
                //             method: 'last',
                //             name: 'can_mileage_end',
                //             type: 'expression'
                //         },
                //         {
                //             expression: '$can_mileage_end - $can_mileage_start',
                //             name: 'total_can_mileage',
                //             type: 'interval'
                //         },
                //         {
                //             expression: 'vehicle.mileage',
                //             method: 'first',
                //             name: 'mileage_start',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'vehicle.mileage',
                //             method: 'last',
                //             name: 'mileage_end',
                //             type: 'expression'
                //         },
                //         {
                //             expression: '$mileage_end - $mileage_start',
                //             name: 'total_mileage',
                //             type: 'interval'
                //         },
                //         {
                //             expression: 'can.tracker.counted.fuel.consumed',
                //             method: 'first',
                //             name: 'can_fuel_consumed_start',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'can.tracker.counted.fuel.consumed',
                //             method: 'last',
                //             name: 'can_fuel_consumed_end',
                //             type: 'expression'
                //         },
                //         {
                //             expression: '$can_fuel_consumed_end - $can_fuel_consumed_start',
                //             name: 'total_can_fuel_consumed',
                //             type: 'interval'
                //         },
                //         {
                //             expression: 'position.speed',
                //             method: 'average',
                //             name: 'avg_speed',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'can.vehicle.speed',
                //             method: 'average',
                //             name: 'avg_can_speed',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'position.speed',
                //             method: 'maximum',
                //             name: 'max_speed',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'can.vehicle.speed',
                //             method: 'maximum',
                //             name: 'max_can_speed',
                //             type: 'expression'
                //         },
                //         {
                //             expression: '$mileage_end - $mileage_start',
                //             method: 'first',
                //             name: 'daily_mileage',
                //             type: 'expression'
                //         },
                //         {
                //             expression: '$can_mileage_end - $can_mileage_start',
                //             method: 'first',
                //             name: 'daily_can_mileage',
                //             type: 'expression'
                //         }
                //     ],
                //     timezone: 'Europe/Paris',
                //     // Utilisation des valeurs de from et to avec stringDateToTimestamp
                //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                // };

                const request = {
                  // calc_id: 1675320,
                  // Utilisation des valeurs de from et to avec stringDateToTimestamp
                  from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                  to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
                  selectors: [
                      {
                          expression: '$engine.ignition.status',
                          type: 'expression',
                          name: '',
                          max_inactive: 120,
                          max_messages_time_diff: 300,
                          merge_message_after: true,
                          merge_message_before: false,
                          merge_unknown: false,
                          min_duration: 60
                      }
                  ],
                  counters: [ 
                      {
                          name: 'ident',
                          type: 'parameter',
                          parameter: 'ident',
                          method: 'first'
                      },
                      {
                          name: 'device.id',
                          type: 'parameter',
                          method: 'first'
                      },
                      {
                          expression: 'position.speed',
                          name: 'avg.speed',
                          type: 'expression',
                          method: 'average'
                      },
                      {
                          expression: 'position.speed',
                          name: 'max.speed',
                          type: 'expression',
                          method: 'maximum'
                      },
                      {
                          name: 'address.start',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'first'
                      },
                      {
                          name: 'address.end',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'last'
                      },
                      {
                          name: 'route',
                          type: 'route'
                      },
                      {
                          name: 'points',
                          type: 'message',
                          method: 'each',
                          fields: [
                              'timestamp',
                              'position.latitude',
                              'position.longitude',
                              'position.altitude',
                              'position.speed',
                              'position.satellites',
                              'movement.status',
                              'engine.ignition.status',
                              'battery.level',
                              'external.powersource.status',
                              'external.powersource.voltage',
                              'gsm.signal.level',
                              'ibutton.code',
                              'vehicle.mileage',
                              'ident',
                              'gisgraphy.address.formatedPostal',
                              'gisgraphy.address.lanes'
                          ],
                          validate_message: ''
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_start',
                          type: 'expression',
                          method: 'first'
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_end',
                          type: 'expression',
                          method: 'last'
                      },
                      {
                          expression: '$mileage_end - $mileage_start',
                          name: 'distance',
                          type: 'interval'
                      },
                      {
                          expression: 'timestamp',
                          name: 'last.active',
                          type: 'expression',
                          method: 'last'
                      }
                  ],
                  timezone: 'Europe/Paris'
              };


                // const response = await fetch(`${flespi_url}/"${vehicle.vehicleDeviceImei}"/calculate`, {
                const response = await fetch(`${flespi_url}/configuration.ident="${vehicle.vehicleDeviceImei}"/calculate`, {
                    method: 'POST',
                    headers: {
                        Authorization: `FlespiToken ${flespi_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                });

                // console.log('ana drbt l query',await response.json())

                if (!response.ok) {
                    console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
                    continue;
                }

                const data = await response.json();
                console.log(data);

                data?.result?.forEach((element) => {
                    totalDuration += element.duration;
                });

                console.log(totalDuration);
            }

            console.log(`Total Duration: ${totalDuration}`);
        }

        // Si calc_id correspond à synthese journalier
        if (calc_id === 1725011) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);

            console.log('ana dkhlt l if');
            // Calculer le nombre de jours entre les deux dates
            const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

            console.log('nb days', numberOfDays);
            for (let i = 0; i < numberOfDays; i++) {
                console.log('ana dkhlt l boucle');
                const currentFromDate = new Date(startDateObj);
                currentFromDate.setDate(startDateObj.getDate() + i);

                const currentToDate = new Date(currentFromDate);
                currentToDate.setDate(currentFromDate.getDate());

                console.log(currentFromDate);
                console.log(currentToDate);

                // Préparer la requête avec calc_id fixe
                // const request = {
                //     calc_id: 1675320,
                //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                // };

                // const request = {
                //     // calc_id: 1675320,
                //     selectors: [
                //         {
                //             expression: '$engine.ignition.status',
                //             max_inactive: 120,
                //             max_messages_time_diff: 300,
                //             merge_message_after: true,
                //             merge_message_before: true,
                //             merge_unknown: true,
                //             method: 'boolean',
                //             min_duration: 60,
                //             type: 'expression'
                //         }
                //     ],
                //     counters: [
                //         {
                //             expression: 'position.speed',
                //             method: 'maximum',
                //             name: 'max.speed',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'mileage()',
                //             method: 'summary',
                //             name: 'distance',
                //             type: 'expression'
                //         },
                //         {
                //             expression: 'segment.vehicle.mileage',
                //             method: 'summary',
                //             name: 'distance_can',
                //             type: 'expression'
                //         },
                //         {
                //             fields: [
                //                 { name: 'tm', value: 'ceil(timestamp)' },
                //                 { name: 'lat', value: 'position.latitude' },
                //                 { name: 'lng', value: 'position.longitude' }
                //             ],
                //             name: 'points',
                //             type: 'dataset',
                //             validate_message: 'position.valid'
                //         },
                //         {
                //             name: 'route',
                //             type: 'route'
                //         },
                //         {
                //             expression: '(distance*3600)/duration',
                //             name: 'avg.speed',
                //             type: 'interval'
                //         }
                //     ],
                //     timezone: 'Europe/Paris',
                //     // Utilisation des valeurs de from et to avec stringDateToTimestamp
                //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                // };

                const request = {
                  // calc_id: 1675320,
                  // Utilisation des valeurs de from et to avec stringDateToTimestamp
                  from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                  to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
                  selectors: [
                      {
                          expression: '$engine.ignition.status',
                          type: 'expression',
                          name: '',
                          max_inactive: 120,
                          max_messages_time_diff: 300,
                          merge_message_after: true,
                          merge_message_before: false,
                          merge_unknown: false,
                          min_duration: 60
                      }
                  ],
                  counters: [
                      {
                          name: 'ident',
                          type: 'parameter',
                          parameter: 'ident',
                          method: 'first'
                      },
                      {
                          name: 'device.id',
                          type: 'parameter',
                          method: 'first'
                      },
                      {
                          expression: 'position.speed',
                          name: 'avg.speed',
                          type: 'expression',
                          method: 'average'
                      },
                      {
                          expression: 'position.speed',
                          name: 'max.speed',
                          type: 'expression',
                          method: 'maximum'
                      },
                      {
                          name: 'address.start',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'first'
                      },
                      {
                          name: 'address.end',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'last'
                      },
                      {
                          name: 'route',
                          type: 'route'
                      },
                      {
                          name: 'points',
                          type: 'message',
                          method: 'each',
                          fields: [
                              'timestamp',
                              'position.latitude',
                              'position.longitude',
                              'position.altitude',
                              'position.speed',
                              'position.satellites',
                              'movement.status',
                              'engine.ignition.status',
                              'battery.level',
                              'external.powersource.status',
                              'external.powersource.voltage',
                              'gsm.signal.level',
                              'ibutton.code',
                              'vehicle.mileage',
                              'ident',
                              'gisgraphy.address.formatedPostal',
                              'gisgraphy.address.lanes'
                          ],
                          validate_message: ''
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_start',
                          type: 'expression',
                          method: 'first'
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_end',
                          type: 'expression',
                          method: 'last'
                      },
                      {
                          expression: '$mileage_end - $mileage_start',
                          name: 'distance',
                          type: 'interval'
                      },
                      {
                          expression: 'timestamp',
                          name: 'last.active',
                          type: 'expression',
                          method: 'last'
                      }
                  ],
                  timezone: 'Europe/Paris'
              };

                // const response = await fetch(`${flespi_url}/"${vehicle.vehicleDeviceImei}"/calculate`, {
                const response = await fetch(`${flespi_url}/configuration.ident="${vehicle.vehicleDeviceImei}"/calculate`, {
                    method: 'POST',
                    headers: {
                        Authorization: `FlespiToken ${flespi_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                });

                // console.log('ana drbt l query',await response.json())

                if (!response.ok) {
                    console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
                    continue;
                }

                const data = await response.json();
                console.log('res dyal flespi',data);

                data?.result?.forEach((element) => {
                  console.log('element.duration',element.duration)
                    totalDuration += element.duration;
                });

                console.log('totalDuration',totalDuration)

                // Ajouter la durée totale du jour à la liste
                // if (totalDuration > 0) {
                  
                    dailyDurations.push(totalDuration);
                // }

                console.log('dailyDurations', dailyDurations)

                // Réinitialiser totalDuration pour le jour suivant
                totalDuration = 0;

                // console.log(totalDuration);
                // if (data?.result?.[0]?.duration) {
                //     totalDuration += data.result[0].duration;
                // }
            }

            console.log(`Total Duration: ${totalDuration}`);


        }

       let request

       console.log('calc_id',calc_id);
       

       if (calc_id === 1695308) {
           // Préparer la requête avec calc_id fixe et les dates dynamiques
            request = {
               // calc_id: 1675320,
               selectors: [
                // {
                //     expression: "engine.ignition.status",
                //     max_inactive: 180,
                //     method: "boolean",
                //     type: "expression"
                // },
                {
                    split: "year",
                    type: "datetime"
                }
            ],
            counters: [
                {
                    method: "first",
                    name: "ident",
                    parameter: "ident",
                    type: "parameter"
                },
                {
                    name: "route",
                    type: "route"
                },
                {
                    expression: "1",
                    method: "duration",
                    name: "driving_time",
                    type: "expression",
                    validate_message: ""
                },
                {
                    expression: "can.vehicle.mileage",
                    method: "first",
                    name: "can_mileage_start",
                    type: "expression"
                },
                {
                    expression: "can.vehicle.mileage",
                    method: "last",
                    name: "can_mileage_end",
                    type: "expression"
                },
                {
                    expression: "$can_mileage_end - $can_mileage_start",
                    name: "total_can_mileage",
                    type: "interval"
                },
                {
                    expression: "vehicle.mileage",
                    method: "first",
                    name: "mileage_start",
                    type: "expression"
                },
                {
                    expression: "vehicle.mileage",
                    method: "last",
                    name: "mileage_end",
                    type: "expression"
                },
                {
                    expression: "$mileage_end - $mileage_start",
                    name: "total_mileage",
                    type: "interval"
                },
                {
                    expression: "can.tracker.counted.fuel.consumed",
                    method: "first",
                    name: "can_fuel_consumed_start",
                    type: "expression"
                },
                {
                    expression: "can.tracker.counted.fuel.consumed",
                    method: "last",
                    name: "can_fuel_consumed_end",
                    type: "expression"
                },
                {
                    expression: "$can_fuel_consumed_end - $can_fuel_consumed_start",
                    name: "total_can_fuel_consumed",
                    type: "interval"
                },
                {
                    expression: "position.speed",
                    method: "average",
                    name: "avg_speed",
                    type: "expression"
                },
                {
                    expression: "can.vehicle.speed",
                    method: "average",
                    name: "avg_can_speed",
                    type: "expression"
                },
                {
                    expression: "position.speed",
                    method: "maximum",
                    name: "max_speed",
                    type: "expression"
                },
                {
                    expression: "can.vehicle.speed",
                    method: "maximum",
                    name: "max_can_speed",
                    type: "expression"
                },
                {
                    expression: "$mileage_end - $mileage_start",
                    method: "first",
                    name: "daily_mileage",
                    type: "expression"
                },
                {
                    expression: "$can_mileage_end - $can_mileage_start",
                    method: "first",
                    name: "daily_can_mileage",
                    type: "expression"
                }
            ],
               timezone: 'Europe/Paris',
               // Utilisation des valeurs de from et to avec stringDateToTimestamp
               from: stringDateToTimestamp(startDate, false),
               to: stringDateToTimestamp(endDate, true)
           };
       } else if (calc_id === 1725011) {
console.log('rani dkhlt l calc');


     // Préparer la requête avec calc_id fixe et les dates dynamiques
     request = {
      // calc_id: 1675320,
      selectors: [
          // {
          //     expression: 'engine.ignition.status',
          //     max_inactive: 180,
          //     method: 'boolean',
          //     type: 'expression'
          // },
          {
              // merge_message_before: true,
              split: 'day',
              type: 'datetime'
          }
      ],
      counters: [
          {
              method: 'first',
              name: 'ident',
              parameter: 'ident',
              type: 'parameter'
          },
          {
              name: 'route',
              type: 'route'
          },
          {
              expression: '1',
              method: 'duration',
              name: 'driving_time',
              type: 'expression',
              validate_message: ''
          },
          {
              expression: 'can.vehicle.mileage',
              method: 'first',
              name: 'can_mileage_start',
              type: 'expression'
          },
          {
              expression: 'can.vehicle.mileage',
              method: 'last',
              name: 'can_mileage_end',
              type: 'expression'
          },
          {
              expression: '$can_mileage_end - $can_mileage_start',
              name: 'daily_can_mileage',
              type: 'interval'
          },
          {
              expression: 'vehicle.mileage',
              method: 'first',
              name: 'mileage_start',
              type: 'expression'
          },
          {
              expression: 'vehicle.mileage',
              method: 'last',
              name: 'mileage_end',
              type: 'expression'
          },
          {
              expression: '$mileage_end - $mileage_start',
              name: 'daily_mileage',
              type: 'interval'
          },
          {
              expression: 'can.tracker.counted.fuel.consumed',
              method: 'first',
              name: 'can_fuel_consumed_start',
              type: 'expression'
          },
          {
              expression: 'can.tracker.counted.fuel.consumed',
              method: 'last',
              name: 'can_fuel_consumed_end',
              type: 'expression'
          },
          {
              expression: '$can_fuel_consumed_end - $can_fuel_consumed_start',
              name: 'total_can_fuel_consumed',
              type: 'interval'
          },
          {
              expression: 'position.speed',
              method: 'average',
              name: 'avg_speed',
              type: 'expression'
          },
          {
              expression: 'can.vehicle.speed',
              method: 'average',
              name: 'avg_can_speed',
              type: 'expression'
          },
          {
              expression: 'position.speed',
              method: 'maximum',
              name: 'max_speed',
              type: 'expression'
          },
          {
              expression: 'can.vehicle.speed',
              method: 'maximum',
              name: 'max_can_speed',
              type: 'expression'
          },
          {
              counter: 'daily_mileage',
              name: 'total_mileage',
              reset_interval: 'day',
              type: 'accumulator'
          },
          {
              counter: 'driving_time',
              name: 'total_duration',
              reset_interval: 'day',
              type: 'accumulator'
          }
      ],
      timezone: 'Europe/Paris',
      // interval: 86400, // Regrouper par jour (24 heures),
      // Utilisation des valeurs de from et to avec stringDateToTimestamp
      from: stringDateToTimestamp(startDate, false),
      to: stringDateToTimestamp(endDate, true)
  };
        
       } 
       else if(calc_id === 1713663){
        // console
        //  request = {
        //   selectors: [
        //     {
        //       expression: "#can.fuel.volume < can.fuel.volume",
        //       max_active: 180,
        //       max_inactive: 90,
        //       max_messages_time_diff: 1800,
        //       merge_message_before: true,
        //       method: "boolean",
        //       min_duration: 30,
        //       name: "fuel increased",
        //       type: "expression"
        //     }
        //   ],
        //   counters: [
        //     {
        //       method: "first",
        //       name: "ident",
        //       parameter: "ident",
        //       type: "parameter"
        //     },
        //     {
        //       method: "first",
        //       name: "device.id",
        //       parameter: "device.id",
        //       type: "parameter"
        //     },
        //     {
        //       method: "first",
        //       name: "fuel.before",
        //       parameter: "can.fuel.volume",
        //       type: "parameter"
        //     },
        //     {
        //       method: "last",
        //       name: "fuel.after",
        //       parameter: "can.fuel.volume",
        //       type: "parameter"
        //     },
        //     {
        //       expression: "fuel.after - fuel.before",
        //       name: "fuel.delta",
        //       type: "interval"
        //     },
        //     {
        //       method: "first",
        //       name: "can.vehicle.mileage",
        //       type: "parameter"
        //     },
        //     {
        //       method: "first",
        //       name: "position.latitude",
        //       type: "parameter"
        //     },
        //     {
        //       method: "first",
        //       name: "position.longitude",
        //       type: "parameter"
        //     },
        //     {
        //       method: "first",
        //       name: "address",
        //       parameter: "gisgraphy.address",
        //       type: "parameter"
        //     }
        //   ],
        //   timezone: "Europe/Paris"
        // };
        request = {
            from: stringDateToTimestamp(startDate, false),
            to: stringDateToTimestamp(endDate, true),
            selectors: [
              {
                expression: "#can.fuel.volume <can.fuel.volume",
                max_active: 180,
                max_inactive: 90,
                max_messages_time_diff: 1800,
                merge_message_before: true,
                method: "boolean",
                min_duration: 30,
                name: "fuel increased",
                type: "expression"
              }
            ],
            // intervals_rotate: 0,
            counters: [
              {
                method: "first",
                name: "ident",
                parameter: "ident",
                type: "parameter"
              },
              {
                method: "first",
                name: "device.id",
                parameter: "device.id",
                type: "parameter"
              },
              {
                method: "first",
                name: "fuel.before",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                method: "last",
                name: "fuel.after",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                expression: "fuel.after-fuel.before",
                name: "fuel.delta",
                type: "interval"
              },
              {
                method: "first",
                name: "can.vehicle.mileage",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.latitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.longitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "address",
                parameter: "gisgraphy.address",
                type: "parameter"
              }
            ],
            timezone: "Europe/Paris",
            // metadata: {}
          };
       }
       else {
           request = {
               // calc_id: 1675320,
               // Utilisation des valeurs de from et to avec stringDateToTimestamp
               from: stringDateToTimestamp(startDate, false),
               to: stringDateToTimestamp(endDate, true),
               selectors: [
                   {
                       expression: '$engine.ignition.status',
                       type: 'expression',
                       name: '',
                       max_inactive: 120,
                       max_messages_time_diff: 300,
                       merge_message_after: true,
                       merge_message_before: false,
                       merge_unknown: false,
                       min_duration: 60
                   }
               ],
               counters: [
                   {
                       name: 'ident',
                       type: 'parameter',
                       parameter: 'ident',
                       method: 'first'
                   },
                   {
                       name: 'device.id',
                       type: 'parameter',
                       method: 'first'
                   },
                   {
                       expression: 'position.speed',
                       name: 'avg.speed',
                       type: 'expression',
                       method: 'average'
                   },
                   {
                       expression: 'position.speed',
                       name: 'max.speed',
                       type: 'expression',
                       method: 'maximum'
                   },
                   {
                       name: 'address.start',
                       type: 'parameter',
                       parameter: 'gisgraphy.address.formatedPostal',
                       method: 'first'
                   },
                   {
                       name: 'address.end',
                       type: 'parameter',
                       parameter: 'gisgraphy.address.formatedPostal',
                       method: 'last'
                   },
                   {
                       name: 'route',
                       type: 'route'
                   },
                   {
                       name: 'points',
                       type: 'message',
                       method: 'each',
                       fields: [
                           'timestamp',
                           'position.latitude',
                           'position.longitude',
                           'position.altitude',
                           'position.speed',
                           'position.satellites',
                           'movement.status',
                           'engine.ignition.status',
                           'battery.level',
                           'external.powersource.status',
                           'external.powersource.voltage',
                           'gsm.signal.level',
                           'ibutton.code',
                           'vehicle.mileage',
                           'ident',
                           'gisgraphy.address.formatedPostal',
                           'gisgraphy.address.lanes'
                       ],
                       validate_message: ''
                   },
                   {
                       expression: 'vehicle.mileage',
                       name: 'mileage_start',
                       type: 'expression',
                       method: 'first'
                   },
                   {
                       expression: 'vehicle.mileage',
                       name: 'mileage_end',
                       type: 'expression',
                       method: 'last'
                   },
                   {
                       expression: '$mileage_end - $mileage_start',
                       name: 'distance',
                       type: 'interval'
                   },
                   {
                       expression: 'timestamp',
                       name: 'last.active',
                       type: 'expression',
                       method: 'last'
                   },
                   {
                    expression: "eco.driving.events.number",
                    method: "last",
                    name: "eco_score",
                    type: "expression"
                  }
               ],
               timezone: 'Europe/Paris'
           };
       }
        

      
        

        // const response = await fetch(`${flespi_url}/"${vehicle.vehicleDeviceImei}"/calculate`, {
        const response = await fetch(`${flespi_url}/configuration.ident="${vehicle.vehicleDeviceImei}"/calculate`, {
            method: 'POST',
            headers: {
                Authorization: `FlespiToken ${flespi_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        // const data = await response.json();
        const data = await response.json();
        console.log(data);

        if (response.ok) {
          console.log('ana f test dyali');
          
            // const data = await response.json();
            // console.log(data);
            if (mode.toLowerCase() === 'trajectory_history') return mapTrajectoryHistory(data['result'], vehicle);
            else if (mode.toLowerCase() === 'daily_summary') return mapDailySummary(data['result'], vehicle, undefined, dailyDurations);
            else if (mode.toLowerCase() === 'fuel_report') return fuelReport(data['result'], vehicle);
            else return mapActivityReport(data['result'], vehicle, undefined, totalDuration);
        }
        return [];
    };

    // By Vehicle Immat
    getReportByVehicleNextDay = async (mode, vehicleImmat, calc_id, startDate, endDate) => {
        const getVehicleResponse = await dalService.getVehicle(vehicleImmat);
        if (getVehicleResponse.status === 'error' || getVehicleResponse.data === null) {
            console.error('The vehicle in question is not recognized in the current database.');
            throw new Error('The vehicle in question is not recognized in the current database.');
        }

        const vehicle = getVehicleResponse.data;
        let totalDuration = 0;

        // const request = {
        //     // calc_id: 1675320,
        //     // Utilisation des valeurs de from et to avec stringDateToTimestamp
        //     from: stringDateToTimestamp(startDate, false),
        //     to: stringDateToTimestamp(endDate, true),
        //     selectors: [
        //         {
        //             expression: '$engine.ignition.status',
        //             type: 'expression',
        //             name: '',
        //             max_inactive: 120,
        //             max_messages_time_diff: 300,
        //             merge_message_after: true,
        //             merge_message_before: false,
        //             merge_unknown: false,
        //             min_duration: 60
        //         }
        //     ],
        //     counters: [
        //         {
        //             name: 'ident',
        //             type: 'parameter',
        //             parameter: 'ident',
        //             method: 'first'
        //         },
        //         {
        //             name: 'device.id',
        //             type: 'parameter',
        //             method: 'first'
        //         },
        //         {
        //             expression: 'position.speed',
        //             name: 'avg.speed',
        //             type: 'expression',
        //             method: 'average'
        //         },
        //         {
        //             expression: 'position.speed',
        //             name: 'max.speed',
        //             type: 'expression',
        //             method: 'maximum'
        //         },
        //         {
        //             name: 'address.start',
        //             type: 'parameter',
        //             parameter: 'gisgraphy.address.formatedPostal',
        //             method: 'first'
        //         },
        //         {
        //             name: 'address.end',
        //             type: 'parameter',
        //             parameter: 'gisgraphy.address.formatedPostal',
        //             method: 'last'
        //         },
        //         {
        //             name: 'route',
        //             type: 'route'
        //         },
        //         {
        //             name: 'points',
        //             type: 'message',
        //             method: 'each',
        //             fields: [
        //                 'timestamp',
        //                 'position.latitude',
        //                 'position.longitude',
        //                 'position.altitude',
        //                 'position.speed',
        //                 'position.satellites',
        //                 'movement.status',
        //                 'engine.ignition.status',
        //                 'battery.level',
        //                 'external.powersource.status',
        //                 'external.powersource.voltage',
        //                 'gsm.signal.level',
        //                 'ibutton.code',
        //                 'vehicle.mileage',
        //                 'ident',
        //                 'gisgraphy.address.formatedPostal',
        //                 'gisgraphy.address.lanes'
        //             ],
        //             validate_message: ''
        //         },
        //         {
        //             expression: 'vehicle.mileage',
        //             name: 'mileage_start',
        //             type: 'expression',
        //             method: 'first'
        //         },
        //         {
        //             expression: 'vehicle.mileage',
        //             name: 'mileage_end',
        //             type: 'expression',
        //             method: 'last'
        //         },
        //         {
        //             expression: '$mileage_end - $mileage_start',
        //             name: 'distance',
        //             type: 'interval'
        //         },
        //         {
        //             expression: 'timestamp',
        //             name: 'last.active',
        //             type: 'expression',
        //             method: 'last'
        //         }
        //     ],
        //     timezone: 'Europe/Paris'
        // };
        
        
       let request

       console.log('calc_id',calc_id);
       

       if (calc_id === 1695308) {
        // Préparer la requête avec calc_id fixe et les dates dynamiques
         request = {
            // calc_id: 1675320,
            selectors: [
             // {
             //     expression: "engine.ignition.status",
             //     max_inactive: 180,
             //     method: "boolean",
             //     type: "expression"
             // },
             {
                 split: "year",
                 type: "datetime"
             }
         ],
         counters: [
             {
                 method: "first",
                 name: "ident",
                 parameter: "ident",
                 type: "parameter"
             },
             {
                 name: "route",
                 type: "route"
             },
             {
                 expression: "1",
                 method: "duration",
                 name: "driving_time",
                 type: "expression",
                 validate_message: ""
             },
             {
                 expression: "can.vehicle.mileage",
                 method: "first",
                 name: "can_mileage_start",
                 type: "expression"
             },
             {
                 expression: "can.vehicle.mileage",
                 method: "last",
                 name: "can_mileage_end",
                 type: "expression"
             },
             {
                 expression: "$can_mileage_end - $can_mileage_start",
                 name: "total_can_mileage",
                 type: "interval"
             },
             {
                 expression: "vehicle.mileage",
                 method: "first",
                 name: "mileage_start",
                 type: "expression"
             },
             {
                 expression: "vehicle.mileage",
                 method: "last",
                 name: "mileage_end",
                 type: "expression"
             },
             {
                 expression: "$mileage_end - $mileage_start",
                 name: "total_mileage",
                 type: "interval"
             },
             {
                 expression: "can.tracker.counted.fuel.consumed",
                 method: "first",
                 name: "can_fuel_consumed_start",
                 type: "expression"
             },
             {
                 expression: "can.tracker.counted.fuel.consumed",
                 method: "last",
                 name: "can_fuel_consumed_end",
                 type: "expression"
             },
             {
                 expression: "$can_fuel_consumed_end - $can_fuel_consumed_start",
                 name: "total_can_fuel_consumed",
                 type: "interval"
             },
             {
                 expression: "position.speed",
                 method: "average",
                 name: "avg_speed",
                 type: "expression"
             },
             {
                 expression: "can.vehicle.speed",
                 method: "average",
                 name: "avg_can_speed",
                 type: "expression"
             },
             {
                 expression: "position.speed",
                 method: "maximum",
                 name: "max_speed",
                 type: "expression"
             },
             {
                 expression: "can.vehicle.speed",
                 method: "maximum",
                 name: "max_can_speed",
                 type: "expression"
             },
             {
                 expression: "$mileage_end - $mileage_start",
                 method: "first",
                 name: "daily_mileage",
                 type: "expression"
             },
             {
                 expression: "$can_mileage_end - $can_mileage_start",
                 method: "first",
                 name: "daily_can_mileage",
                 type: "expression"
             }
         ],
            timezone: 'Europe/Paris',
            // Utilisation des valeurs de from et to avec stringDateToTimestamp
            from: stringDateToTimestamp(startDate, false),
            to: stringDateToTimestamp(endDate, true)
        };
    } else if (calc_id === 1725011) {
console.log('rani dkhlt l calc');


  // Préparer la requête avec calc_id fixe et les dates dynamiques
  request = {
   // calc_id: 1675320,
   selectors: [
       // {
       //     expression: 'engine.ignition.status',
       //     max_inactive: 180,
       //     method: 'boolean',
       //     type: 'expression'
       // },
       {
           // merge_message_before: true,
           split: 'day',
           type: 'datetime'
       }
   ],
   counters: [
       {
           method: 'first',
           name: 'ident',
           parameter: 'ident',
           type: 'parameter'
       },
       {
           name: 'route',
           type: 'route'
       },
       {
           expression: '1',
           method: 'duration',
           name: 'driving_time',
           type: 'expression',
           validate_message: ''
       },
       {
           expression: 'can.vehicle.mileage',
           method: 'first',
           name: 'can_mileage_start',
           type: 'expression'
       },
       {
           expression: 'can.vehicle.mileage',
           method: 'last',
           name: 'can_mileage_end',
           type: 'expression'
       },
       {
           expression: '$can_mileage_end - $can_mileage_start',
           name: 'daily_can_mileage',
           type: 'interval'
       },
       {
           expression: 'vehicle.mileage',
           method: 'first',
           name: 'mileage_start',
           type: 'expression'
       },
       {
           expression: 'vehicle.mileage',
           method: 'last',
           name: 'mileage_end',
           type: 'expression'
       },
       {
           expression: '$mileage_end - $mileage_start',
           name: 'daily_mileage',
           type: 'interval'
       },
       {
           expression: 'can.tracker.counted.fuel.consumed',
           method: 'first',
           name: 'can_fuel_consumed_start',
           type: 'expression'
       },
       {
           expression: 'can.tracker.counted.fuel.consumed',
           method: 'last',
           name: 'can_fuel_consumed_end',
           type: 'expression'
       },
       {
           expression: '$can_fuel_consumed_end - $can_fuel_consumed_start',
           name: 'total_can_fuel_consumed',
           type: 'interval'
       },
       {
           expression: 'position.speed',
           method: 'average',
           name: 'avg_speed',
           type: 'expression'
       },
       {
           expression: 'can.vehicle.speed',
           method: 'average',
           name: 'avg_can_speed',
           type: 'expression'
       },
       {
           expression: 'position.speed',
           method: 'maximum',
           name: 'max_speed',
           type: 'expression'
       },
       {
           expression: 'can.vehicle.speed',
           method: 'maximum',
           name: 'max_can_speed',
           type: 'expression'
       },
       {
           counter: 'daily_mileage',
           name: 'total_mileage',
           reset_interval: 'day',
           type: 'accumulator'
       },
       {
           counter: 'driving_time',
           name: 'total_duration',
           reset_interval: 'day',
           type: 'accumulator'
       }
   ],
   timezone: 'Europe/Paris',
   // interval: 86400, // Regrouper par jour (24 heures),
   // Utilisation des valeurs de from et to avec stringDateToTimestamp
   from: stringDateToTimestamp(startDate, false),
   to: stringDateToTimestamp(endDate, true)
};
     
    } 
    else if(calc_id === 1713663){
        request = {
            from: stringDateToTimestamp(startDate, false),
            to: stringDateToTimestamp(endDate, true),
            selectors: [
              {
                expression: "#can.fuel.volume <can.fuel.volume",
                max_active: 180,
                max_inactive: 90,
                max_messages_time_diff: 1800,
                merge_message_before: true,
                method: "boolean",
                min_duration: 30,
                name: "fuel increased",
                type: "expression"
              }
            ],
            // intervals_rotate: 0,
            counters: [
              {
                method: "first",
                name: "ident",
                parameter: "ident",
                type: "parameter"
              },
              {
                method: "first",
                name: "device.id",
                parameter: "device.id",
                type: "parameter"
              },
              {
                method: "first",
                name: "fuel.before",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                method: "last",
                name: "fuel.after",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                expression: "fuel.after-fuel.before",
                name: "fuel.delta",
                type: "interval"
              },
              {
                method: "first",
                name: "can.vehicle.mileage",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.latitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.longitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "address",
                parameter: "gisgraphy.address",
                type: "parameter"
              }
            ],
            timezone: "Europe/Paris",
            // metadata: {}
          };
     
    }
    else {
        request = {
            // calc_id: 1675320,
            // Utilisation des valeurs de from et to avec stringDateToTimestamp
            from: stringDateToTimestamp(startDate, false),
            to: stringDateToTimestamp(endDate, true),
            selectors: [
                {
                    expression: '$engine.ignition.status',
                    type: 'expression',
                    name: '',
                    max_inactive: 120,
                    max_messages_time_diff: 300,
                    merge_message_after: true,
                    merge_message_before: false,
                    merge_unknown: false,
                    min_duration: 60
                }
            ],
            counters: [
                {
                    name: 'ident',
                    type: 'parameter',
                    parameter: 'ident',
                    method: 'first'
                },
                {
                    name: 'device.id',
                    type: 'parameter',
                    method: 'first'
                },
                {
                    expression: 'position.speed',
                    name: 'avg.speed',
                    type: 'expression',
                    method: 'average'
                },
                {
                    expression: 'position.speed',
                    name: 'max.speed',
                    type: 'expression',
                    method: 'maximum'
                },
                {
                    name: 'address.start',
                    type: 'parameter',
                    parameter: 'gisgraphy.address.formatedPostal',
                    method: 'first'
                },
                {
                    name: 'address.end',
                    type: 'parameter',
                    parameter: 'gisgraphy.address.formatedPostal',
                    method: 'last'
                },
                {
                    name: 'route',
                    type: 'route'
                },
                {
                    name: 'points',
                    type: 'message',
                    method: 'each',
                    fields: [
                        'timestamp',
                        'position.latitude',
                        'position.longitude',
                        'position.altitude',
                        'position.speed',
                        'position.satellites',
                        'movement.status',
                        'engine.ignition.status',
                        'battery.level',
                        'external.powersource.status',
                        'external.powersource.voltage',
                        'gsm.signal.level',
                        'ibutton.code',
                        'vehicle.mileage',
                        'ident',
                        'gisgraphy.address.formatedPostal',
                        'gisgraphy.address.lanes'
                    ],
                    validate_message: ''
                },
                {
                    expression: 'vehicle.mileage',
                    name: 'mileage_start',
                    type: 'expression',
                    method: 'first'
                },
                {
                    expression: 'vehicle.mileage',
                    name: 'mileage_end',
                    type: 'expression',
                    method: 'last'
                },
                {
                    expression: '$mileage_end - $mileage_start',
                    name: 'distance',
                    type: 'interval'
                },
                {
                    expression: 'timestamp',
                    name: 'last.active',
                    type: 'expression',
                    method: 'last'
                },
                {
                 expression: "eco.driving.events.number",
                 method: "last",
                 name: "eco_score",
                 type: "expression"
               }
            ],
            timezone: 'Europe/Paris'
        };
    }
        
        const response = await fetch(`${flespi_url}/configuration.ident="${vehicle.vehicleDeviceImei}"/calculate`, {
            method: 'POST',
            headers: {
                Authorization: `FlespiToken ${flespi_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });

        if (response.ok) {
            const data = await response.json();
            console.log(data);
            if (mode.toLowerCase() === 'trajectory_history') return mapTrajectoryHistory(data['result'], vehicle);
            else if (mode.toLowerCase() === 'daily_summary') return mapDailySummary(data['result'], vehicle);
            else if (mode.toLowerCase() === 'fuel_report') return fuelReport(data['result'], vehicle);
            else return mapActivityReport(data['result'], vehicle);
        }
        return [];
    };

    // By Tag Id
    getReportByTagId = async (mode, vehicles, calc_id, startDate, endDate) => {
        const imei_s = vehicles.map((vehicle) => vehicle?.vehicleDeviceImei);
        const identString = imei_s.map((id) => `configuration.ident="${id}"`).join('||');
        console.log(`identString : ${identString}`);

        let totalDuration = 0;
        let dailyDurations = []; // Liste pour stocker les valeurs de totalDuration

        // Si calc_id correspond à bilan d'activitge
        // if (calc_id === 1695308) {
        //     const startDateObj = new Date(startDate);
        //     const endDateObj = new Date(endDate);

        //     console.log('ana dkhlt l if');
        //     // Calculer le nombre de jours entre les deux dates
        //     const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

        //     console.log('nb days', numberOfDays);
        //     for (let i = 0; i < numberOfDays; i++) {
        //         console.log('ana dkhlt l boucle');
        //         const currentFromDate = new Date(startDateObj);
        //         currentFromDate.setDate(startDateObj.getDate() + i);

        //         const currentToDate = new Date(currentFromDate);
        //         currentToDate.setDate(currentFromDate.getDate());

        //         console.log(currentFromDate);
        //         console.log(currentToDate);

        //         // Préparer la requête avec calc_id fixe
        //         // const request = {
        //         //     calc_id: 1675320,
        //         //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
        //         //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
        //         // };

        //         const request = {
        //           // calc_id: 1675320,
        //           // Utilisation des valeurs de from et to avec stringDateToTimestamp
        //           from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
        //           to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
        //           selectors: [
        //               {
        //                   expression: '$engine.ignition.status',
        //                   type: 'expression',
        //                   name: '',
        //                   max_inactive: 120,
        //                   max_messages_time_diff: 300,
        //                   merge_message_after: true,
        //                   merge_message_before: false,
        //                   merge_unknown: false,
        //                   min_duration: 60
        //               }
        //           ],
        //           counters: [ 
        //               {
        //                   name: 'ident',
        //                   type: 'parameter',
        //                   parameter: 'ident',
        //                   method: 'first'
        //               },
        //               {
        //                   name: 'device.id',
        //                   type: 'parameter',
        //                   method: 'first'
        //               },
        //               {
        //                   expression: 'position.speed',
        //                   name: 'avg.speed',
        //                   type: 'expression',
        //                   method: 'average'
        //               },
        //               {
        //                   expression: 'position.speed',
        //                   name: 'max.speed',
        //                   type: 'expression',
        //                   method: 'maximum'
        //               },
        //               {
        //                   name: 'address.start',
        //                   type: 'parameter',
        //                   parameter: 'gisgraphy.address.formatedPostal',
        //                   method: 'first'
        //               },
        //               {
        //                   name: 'address.end',
        //                   type: 'parameter',
        //                   parameter: 'gisgraphy.address.formatedPostal',
        //                   method: 'last'
        //               },
        //               {
        //                   name: 'route',
        //                   type: 'route'
        //               },
        //               {
        //                   name: 'points',
        //                   type: 'message',
        //                   method: 'each',
        //                   fields: [
        //                       'timestamp',
        //                       'position.latitude',
        //                       'position.longitude',
        //                       'position.altitude',
        //                       'position.speed',
        //                       'position.satellites',
        //                       'movement.status',
        //                       'engine.ignition.status',
        //                       'battery.level',
        //                       'external.powersource.status',
        //                       'external.powersource.voltage',
        //                       'gsm.signal.level',
        //                       'ibutton.code',
        //                       'vehicle.mileage',
        //                       'ident',
        //                       'gisgraphy.address.formatedPostal',
        //                       'gisgraphy.address.lanes'
        //                   ],
        //                   validate_message: ''
        //               },
        //               {
        //                   expression: 'vehicle.mileage',
        //                   name: 'mileage_start',
        //                   type: 'expression',
        //                   method: 'first'
        //               },
        //               {
        //                   expression: 'vehicle.mileage',
        //                   name: 'mileage_end',
        //                   type: 'expression',
        //                   method: 'last'
        //               },
        //               {
        //                   expression: '$mileage_end - $mileage_start',
        //                   name: 'distance',
        //                   type: 'interval'
        //               },
        //               {
        //                   expression: 'timestamp',
        //                   name: 'last.active',
        //                   type: 'expression',
        //                   method: 'last'
        //               }
        //           ],
        //           timezone: 'Europe/Paris'
        //       };

        //         const response = await fetch(`${flespi_url}/{${identString}}/calculate`, {
        //             method: 'POST',
        //             headers: {
        //                 Authorization: `FlespiToken ${flespi_token}`,
        //                 'Content-Type': 'application/json'
        //             },
        //             body: JSON.stringify(request)
        //         });

        //         // console.log('ana drbt l query',await response.json())

        //         if (!response.ok) {
        //             console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
        //             continue;
        //         }

        //         const data = await response.json();
        //         console.log(data);

        //         data?.result?.forEach((element) => {
        //             totalDuration += element.duration;
        //         });

        //         console.log(totalDuration);
        //     }

        //     console.log(`Total Duration: ${totalDuration}`);
        // }

        // // Si calc_id correspond à synthese journalier
        // if (calc_id === 1725011) {
        //     const startDateObj = new Date(startDate);
        //     const endDateObj = new Date(endDate);

        //     console.log('ana dkhlt l if');
        //     // Calculer le nombre de jours entre les deux dates
        //     const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

        //     console.log('nb days', numberOfDays);
        //     for (let i = 0; i < numberOfDays; i++) {
        //         console.log('ana dkhlt l boucle');
        //         const currentFromDate = new Date(startDateObj);
        //         currentFromDate.setDate(startDateObj.getDate() + i);

        //         const currentToDate = new Date(currentFromDate);
        //         currentToDate.setDate(currentFromDate.getDate());

        //         console.log(currentFromDate);
        //         console.log(currentToDate);

        //         // Préparer la requête avec calc_id fixe
        //         // const request = {
        //         //     calc_id: 1675320,
        //         //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
        //         //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
        //         // };

        //         const request = {
        //           // calc_id: 1675320,
        //           // Utilisation des valeurs de from et to avec stringDateToTimestamp
        //           from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
        //           to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
        //           selectors: [
        //               {
        //                   expression: '$engine.ignition.status',
        //                   type: 'expression',
        //                   name: '',
        //                   max_inactive: 120,
        //                   max_messages_time_diff: 300,
        //                   merge_message_after: true,
        //                   merge_message_before: false,
        //                   merge_unknown: false,
        //                   min_duration: 60
        //               }
        //           ],
        //           counters: [
        //               {
        //                   name: 'ident',
        //                   type: 'parameter',
        //                   parameter: 'ident',
        //                   method: 'first'
        //               },
        //               {
        //                   name: 'device.id',
        //                   type: 'parameter',
        //                   method: 'first'
        //               },
        //               {
        //                   expression: 'position.speed',
        //                   name: 'avg.speed',
        //                   type: 'expression',
        //                   method: 'average'
        //               },
        //               {
        //                   expression: 'position.speed',
        //                   name: 'max.speed',
        //                   type: 'expression',
        //                   method: 'maximum'
        //               },
        //               {
        //                   name: 'address.start',
        //                   type: 'parameter',
        //                   parameter: 'gisgraphy.address.formatedPostal',
        //                   method: 'first'
        //               },
        //               {
        //                   name: 'address.end',
        //                   type: 'parameter',
        //                   parameter: 'gisgraphy.address.formatedPostal',
        //                   method: 'last'
        //               },
        //               {
        //                   name: 'route',
        //                   type: 'route'
        //               },
        //               {
        //                   name: 'points',
        //                   type: 'message',
        //                   method: 'each',
        //                   fields: [
        //                       'timestamp',
        //                       'position.latitude',
        //                       'position.longitude',
        //                       'position.altitude',
        //                       'position.speed',
        //                       'position.satellites',
        //                       'movement.status',
        //                       'engine.ignition.status',
        //                       'battery.level',
        //                       'external.powersource.status',
        //                       'external.powersource.voltage',
        //                       'gsm.signal.level',
        //                       'ibutton.code',
        //                       'vehicle.mileage',
        //                       'ident',
        //                       'gisgraphy.address.formatedPostal',
        //                       'gisgraphy.address.lanes'
        //                   ],
        //                   validate_message: ''
        //               },
        //               {
        //                   expression: 'vehicle.mileage',
        //                   name: 'mileage_start',
        //                   type: 'expression',
        //                   method: 'first'
        //               },
        //               {
        //                   expression: 'vehicle.mileage',
        //                   name: 'mileage_end',
        //                   type: 'expression',
        //                   method: 'last'
        //               },
        //               {
        //                   expression: '$mileage_end - $mileage_start',
        //                   name: 'distance',
        //                   type: 'interval'
        //               },
        //               {
        //                   expression: 'timestamp',
        //                   name: 'last.active',
        //                   type: 'expression',
        //                   method: 'last'
        //               }
        //           ],
        //           timezone: 'Europe/Paris'
        //       };

        //         const response = await fetch(`${flespi_url}/{${identString}}/calculate`, {
        //             method: 'POST',
        //             headers: {
        //                 Authorization: `FlespiToken ${flespi_token}`,
        //                 'Content-Type': 'application/json'
        //             },
        //             body: JSON.stringify(request)
        //         });

        //         // console.log('ana drbt l query',await response.json())

        //         if (!response.ok) {
        //             console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
        //             continue;
        //         }

        //         const data = await response.json();
        //         console.log(data);

        //         data?.result?.forEach((element) => {
        //             totalDuration += element.duration;
        //         });

        //         // Ajouter la durée totale du jour à la liste
        //         // if (totalDuration > 0) {
        //             dailyDurations.push(totalDuration);
        //         // }

        //         // Réinitialiser totalDuration pour le jour suivant
        //         totalDuration = 0;

        //         console.log(totalDuration);
        //         // if (data?.result?.[0]?.duration) {
        //         //     totalDuration += data.result[0].duration;
        //         // }
        //     }

        //     console.log(`Total Duration: ${totalDuration}`);
        // }

        let request

        console.log('calc_id',calc_id);
        

        if (calc_id === 1695308) {
          // Préparer la requête avec calc_id fixe et les dates dynamiques
           request = {
              // calc_id: 1675320,
              selectors: [
               // {
               //     expression: "engine.ignition.status",
               //     max_inactive: 180,
               //     method: "boolean",
               //     type: "expression"
               // },
               {
                   split: "year",
                   type: "datetime"
               }
           ],
           counters: [
               {
                   method: "first",
                   name: "ident",
                   parameter: "ident",
                   type: "parameter"
               },
               {
                   name: "route",
                   type: "route"
               },
               {
                   expression: "1",
                   method: "duration",
                   name: "driving_time",
                   type: "expression"
               },
               {
                   expression: "can.vehicle.mileage",
                   method: "first",
                   name: "can_mileage_start",
                   type: "expression"
               },
               {
                   expression: "can.vehicle.mileage",
                   method: "last",
                   name: "can_mileage_end",
                   type: "expression"
               },
               {
                   expression: "$can_mileage_end - $can_mileage_start",
                   name: "total_can_mileage",
                   type: "interval"
               },
               {
                   expression: "vehicle.mileage",
                   method: "first",
                   name: "mileage_start",
                   type: "expression"
               },
               {
                   expression: "vehicle.mileage",
                   method: "last",
                   name: "mileage_end",
                   type: "expression"
               },
               {
                   expression: "$mileage_end - $mileage_start",
                   name: "total_mileage",
                   type: "interval"
               },
               {
                   expression: "can.tracker.counted.fuel.consumed",
                   method: "first",
                   name: "can_fuel_consumed_start",
                   type: "expression"
               },
               {
                   expression: "can.tracker.counted.fuel.consumed",
                   method: "last",
                   name: "can_fuel_consumed_end",
                   type: "expression"
               },
               {
                   expression: "$can_fuel_consumed_end - $can_fuel_consumed_start",
                   name: "total_can_fuel_consumed",
                   type: "interval"
               },
               {
                   expression: "position.speed",
                   method: "average",
                   name: "avg_speed",
                   type: "expression"
               },
               {
                   expression: "can.vehicle.speed",
                   method: "average",
                   name: "avg_can_speed",
                   type: "expression"
               },
               {
                   expression: "position.speed",
                   method: "maximum",
                   name: "max_speed",
                   type: "expression"
               },
               {
                   expression: "can.vehicle.speed",
                   method: "maximum",
                   name: "max_can_speed",
                   type: "expression"
               },
               {
                   expression: "$mileage_end - $mileage_start",
                   method: "first",
                   name: "daily_mileage",
                   type: "expression"
               },
               {
                   expression: "$can_mileage_end - $can_mileage_start",
                   method: "first",
                   name: "daily_can_mileage",
                   type: "expression"
               }
           ],
              timezone: 'Europe/Paris',
              // Utilisation des valeurs de from et to avec stringDateToTimestamp
              from: stringDateToTimestamp(startDate, false),
              to: stringDateToTimestamp(endDate, true)
          };
      } else if (calc_id === 1725011) {
console.log('rani dkhlt l calc');


    // Préparer la requête avec calc_id fixe et les dates dynamiques
    request = {
     // calc_id: 1675320,
     selectors: [
         // {
         //     expression: 'engine.ignition.status',
         //     max_inactive: 180,
         //     method: 'boolean',
         //     type: 'expression'
         // },
         {
             // merge_message_before: true,
             split: 'day',
             type: 'datetime'
         }
     ],
     counters: [
         {
             method: 'first',
             name: 'ident',
             parameter: 'ident',
             type: 'parameter'
         },
         {
             name: 'route',
             type: 'route'
         },
         {
             expression: '1',
             method: 'duration',
             name: 'driving_time',
             type: 'expression',
             validate_message: ''
         },
         {
             expression: 'can.vehicle.mileage',
             method: 'first',
             name: 'can_mileage_start',
             type: 'expression'
         },
         {
             expression: 'can.vehicle.mileage',
             method: 'last',
             name: 'can_mileage_end',
             type: 'expression'
         },
         {
             expression: '$can_mileage_end - $can_mileage_start',
             name: 'daily_can_mileage',
             type: 'interval'
         },
         {
             expression: 'vehicle.mileage',
             method: 'first',
             name: 'mileage_start',
             type: 'expression'
         },
         {
             expression: 'vehicle.mileage',
             method: 'last',
             name: 'mileage_end',
             type: 'expression'
         },
         {
             expression: '$mileage_end - $mileage_start',
             name: 'daily_mileage',
             type: 'interval'
         },
         {
             expression: 'can.tracker.counted.fuel.consumed',
             method: 'first',
             name: 'can_fuel_consumed_start',
             type: 'expression'
         },
         {
             expression: 'can.tracker.counted.fuel.consumed',
             method: 'last',
             name: 'can_fuel_consumed_end',
             type: 'expression'
         },
         {
             expression: '$can_fuel_consumed_end - $can_fuel_consumed_start',
             name: 'total_can_fuel_consumed',
             type: 'interval'
         },
         {
             expression: 'position.speed',
             method: 'average',
             name: 'avg_speed',
             type: 'expression'
         },
         {
             expression: 'can.vehicle.speed',
             method: 'average',
             name: 'avg_can_speed',
             type: 'expression'
         },
         {
             expression: 'position.speed',
             method: 'maximum',
             name: 'max_speed',
             type: 'expression'
         },
         {
             expression: 'can.vehicle.speed',
             method: 'maximum',
             name: 'max_can_speed',
             type: 'expression'
         },
         {
             counter: 'daily_mileage',
             name: 'total_mileage',
             reset_interval: 'day',
             type: 'accumulator'
         },
         {
             counter: 'driving_time',
             name: 'total_duration',
             reset_interval: 'day',
             type: 'accumulator'
         }
     ],
     timezone: 'Europe/Paris',
     // interval: 86400, // Regrouper par jour (24 heures),
     // Utilisation des valeurs de from et to avec stringDateToTimestamp
     from: stringDateToTimestamp(startDate, false),
     to: stringDateToTimestamp(endDate, true)
 };
       
      } 
      else if(calc_id === 1713663){
        request = {
            from: stringDateToTimestamp(startDate, false),
            to: stringDateToTimestamp(endDate, true),
            selectors: [
              {
                expression: "#can.fuel.volume <can.fuel.volume",
                max_active: 180,
                max_inactive: 90,
                max_messages_time_diff: 1800,
                merge_message_before: true,
                method: "boolean",
                min_duration: 30,
                name: "fuel increased",
                type: "expression"
              }
            ],
            // intervals_rotate: 0,
            counters: [
              {
                method: "first",
                name: "ident",
                parameter: "ident",
                type: "parameter"
              },
              {
                method: "first",
                name: "device.id",
                parameter: "device.id",
                type: "parameter"
              },
              {
                method: "first",
                name: "fuel.before",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                method: "last",
                name: "fuel.after",
                parameter: "can.fuel.volume",
                type: "parameter"
              },
              {
                expression: "fuel.after-fuel.before",
                name: "fuel.delta",
                type: "interval"
              },
              {
                method: "first",
                name: "can.vehicle.mileage",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.latitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "position.longitude",
                type: "parameter"
              },
              {
                method: "first",
                name: "address",
                parameter: "gisgraphy.address",
                type: "parameter"
              }
            ],
            timezone: "Europe/Paris",
            // metadata: {}
          };
       
      }
      else {
          request = {
              // calc_id: 1675320,
              // Utilisation des valeurs de from et to avec stringDateToTimestamp
              from: stringDateToTimestamp(startDate, false),
              to: stringDateToTimestamp(endDate, true),
              selectors: [
                  {
                      expression: '$engine.ignition.status',
                      type: 'expression',
                      name: '',
                      max_inactive: 120,
                      max_messages_time_diff: 300,
                      merge_message_after: true,
                      merge_message_before: false,
                      merge_unknown: false,
                      min_duration: 60
                  }
              ],
              counters: [
                  {
                      name: 'ident',
                      type: 'parameter',
                      parameter: 'ident',
                      method: 'first'
                  },
                  {
                      name: 'device.id',
                      type: 'parameter',
                      method: 'first'
                  },
                  {
                      expression: 'position.speed',
                      name: 'avg.speed',
                      type: 'expression',
                      method: 'average'
                  },
                  {
                      expression: 'position.speed',
                      name: 'max.speed',
                      type: 'expression',
                      method: 'maximum'
                  },
                  {
                      name: 'address.start',
                      type: 'parameter',
                      parameter: 'gisgraphy.address.formatedPostal',
                      method: 'first'
                  },
                  {
                      name: 'address.end',
                      type: 'parameter',
                      parameter: 'gisgraphy.address.formatedPostal',
                      method: 'last'
                  },
                  {
                      name: 'route',
                      type: 'route'
                  },
                  {
                      name: 'points',
                      type: 'message',
                      method: 'each',
                      fields: [
                          'timestamp',
                          'position.latitude',
                          'position.longitude',
                          'position.altitude',
                          'position.speed',
                          'position.satellites',
                          'movement.status',
                          'engine.ignition.status',
                          'battery.level',
                          'external.powersource.status',
                          'external.powersource.voltage',
                          'gsm.signal.level',
                          'ibutton.code',
                          'vehicle.mileage',
                          'ident',
                          'gisgraphy.address.formatedPostal',
                          'gisgraphy.address.lanes'
                      ],
                      validate_message: ''
                  },
                  {
                      expression: 'vehicle.mileage',
                      name: 'mileage_start',
                      type: 'expression',
                      method: 'first'
                  },
                  {
                      expression: 'vehicle.mileage',
                      name: 'mileage_end',
                      type: 'expression',
                      method: 'last'
                  },
                  {
                      expression: '$mileage_end - $mileage_start',
                      name: 'distance',
                      type: 'interval'
                  },
                  {
                      expression: 'timestamp',
                      name: 'last.active',
                      type: 'expression',
                      method: 'last'
                  },
                  {
                   expression: "eco.driving.events.number",
                   method: "last",
                   name: "eco_score",
                   type: "expression"
                 }
              ],
              timezone: 'Europe/Paris'
          };
      }
       


        const response = await fetch(`${flespi_url}/{${identString}}/calculate`, {
            method: 'POST',
            headers: {
                Authorization: `FlespiToken ${flespi_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(request)
        });


        if (response.ok) {
            const data = await response.json();
            console.log('data',data);
            
            const reports = data['result'].map((report) => {
                const vehicle = vehicles.find((vehicle) => vehicle['vehicleDeviceImei'] === report['ident']);
                report['vehicle'] = vehicle ? vehicle : {};
                return report;
            });
            if (mode.toLowerCase() === 'trajectory_history') return mapTrajectoryHistory(reports);
            else if (mode.toLowerCase() === 'daily_summary') return mapDailySummaryTag(reports, undefined, undefined, dailyDurations);
            else if (mode.toLowerCase() === 'fuel_report') return fuelReport(reports);
            else return mapActivityReport(reports, undefined, undefined, totalDuration);
        }
        return [];
    };

    // By Driver Sub
    getReportByDriver = async (mode, links, calc_id, startDate, endDate) => {
        const result = [];
        for (const link of links) {
            if (link?.vehicle?.vehicleDeviceImei) {
                let totalDuration = 0;
                let dailyDurations = []; // Liste pour stocker les valeurs de totalDuration

                // Si calc_id correspond à bilan d'activitge
                if (calc_id === 1695308) {
                    const startDateObj = new Date(startDate);
                    const endDateObj = new Date(endDate);

                    console.log('ana dkhlt l if');
                    // Calculer le nombre de jours entre les deux dates
                    const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

                    console.log('nb days', numberOfDays);
                    for (let i = 0; i < numberOfDays; i++) {
                        console.log('ana dkhlt l boucle');
                        const currentFromDate = new Date(startDateObj);
                        currentFromDate.setDate(startDateObj.getDate() + i);

                        const currentToDate = new Date(currentFromDate);
                        currentToDate.setDate(currentFromDate.getDate());

                        console.log(currentFromDate);
                        console.log(currentToDate);

                        // // Préparer la requête avec calc_id fixe
                        // const request = {
                        //     calc_id: 1675320,
                        //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                        //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                        // };

                        const request = {
                          // calc_id: 1675320,
                          // Utilisation des valeurs de from et to avec stringDateToTimestamp
                          from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                          to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
                          selectors: [
                              {
                                  expression: '$engine.ignition.status',
                                  type: 'expression',
                                  name: '',
                                  max_inactive: 120,
                                  max_messages_time_diff: 300,
                                  merge_message_after: true,
                                  merge_message_before: false,
                                  merge_unknown: false,
                                  min_duration: 60
                              }
                          ],
                          counters: [ 
                              {
                                  name: 'ident',
                                  type: 'parameter',
                                  parameter: 'ident',
                                  method: 'first'
                              },
                              {
                                  name: 'device.id',
                                  type: 'parameter',
                                  method: 'first'
                              },
                              {
                                  expression: 'position.speed',
                                  name: 'avg.speed',
                                  type: 'expression',
                                  method: 'average'
                              },
                              {
                                  expression: 'position.speed',
                                  name: 'max.speed',
                                  type: 'expression',
                                  method: 'maximum'
                              },
                              {
                                  name: 'address.start',
                                  type: 'parameter',
                                  parameter: 'gisgraphy.address.formatedPostal',
                                  method: 'first'
                              },
                              {
                                  name: 'address.end',
                                  type: 'parameter',
                                  parameter: 'gisgraphy.address.formatedPostal',
                                  method: 'last'
                              },
                              {
                                  name: 'route',
                                  type: 'route'
                              },
                              {
                                  name: 'points',
                                  type: 'message',
                                  method: 'each',
                                  fields: [
                                      'timestamp',
                                      'position.latitude',
                                      'position.longitude',
                                      'position.altitude',
                                      'position.speed',
                                      'position.satellites',
                                      'movement.status',
                                      'engine.ignition.status',
                                      'battery.level',
                                      'external.powersource.status',
                                      'external.powersource.voltage',
                                      'gsm.signal.level',
                                      'ibutton.code',
                                      'vehicle.mileage',
                                      'ident',
                                      'gisgraphy.address.formatedPostal',
                                      'gisgraphy.address.lanes'
                                  ],
                                  validate_message: ''
                              },
                              {
                                  expression: 'vehicle.mileage',
                                  name: 'mileage_start',
                                  type: 'expression',
                                  method: 'first'
                              },
                              {
                                  expression: 'vehicle.mileage',
                                  name: 'mileage_end',
                                  type: 'expression',
                                  method: 'last'
                              },
                              {
                                  expression: '$mileage_end - $mileage_start',
                                  name: 'distance',
                                  type: 'interval'
                              },
                              {
                                  expression: 'timestamp',
                                  name: 'last.active',
                                  type: 'expression',
                                  method: 'last'
                              }
                          ],
                          timezone: 'Europe/Paris'
                      };
        

                        const response = await fetch(`${flespi_url}/configuration.ident="${link?.vehicle?.vehicleDeviceImei}"/calculate`, {
                            method: 'POST',
                            headers: {
                                Authorization: `FlespiToken ${flespi_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(request)
                        });

                        // console.log('ana drbt l query',await response.json())

                        if (!response.ok) {
                            console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
                            continue;
                        }

                        const data = await response.json();
                        console.log(data);

                        data?.result?.forEach((element) => {
                            totalDuration += element.duration;
                        });

                        console.log(totalDuration);
                    }

                    console.log(`Total Duration: ${totalDuration}`);
                }

                // Si calc_id correspond à synthese journalier
                if (calc_id === 1725011) {
                    const startDateObj = new Date(startDate);
                    const endDateObj = new Date(endDate);

                    console.log('ana dkhlt l if');
                    // Calculer le nombre de jours entre les deux dates
                    const numberOfDays = Math.floor((endDateObj - startDateObj) / (1000 * 60 * 60 * 24)) + 1;

                    console.log('nb days', numberOfDays);
                    for (let i = 0; i < numberOfDays; i++) {
                        console.log('ana dkhlt l boucle');
                        const currentFromDate = new Date(startDateObj);
                        currentFromDate.setDate(startDateObj.getDate() + i);

                        const currentToDate = new Date(currentFromDate);
                        currentToDate.setDate(currentFromDate.getDate());

                        console.log(currentFromDate);
                        console.log(currentToDate);

                        // Préparer la requête avec calc_id fixe
                        // const request = {
                        //     calc_id: 1675320,
                        //     from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                        //     to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true)
                        // };

                     
                const request = {
                  // calc_id: 1675320,
                  // Utilisation des valeurs de from et to avec stringDateToTimestamp
                  from: stringDateToTimestamp(currentFromDate.toISOString().split('T')[0], false),
                  to: stringDateToTimestamp(currentToDate.toISOString().split('T')[0], true),
                  selectors: [
                      {
                          expression: '$engine.ignition.status',
                          type: 'expression',
                          name: '',
                          max_inactive: 120,
                          max_messages_time_diff: 300,
                          merge_message_after: true,
                          merge_message_before: false,
                          merge_unknown: false,
                          min_duration: 60
                      }
                  ],
                  counters: [
                      {
                          name: 'ident',
                          type: 'parameter',
                          parameter: 'ident',
                          method: 'first'
                      },
                      {
                          name: 'device.id',
                          type: 'parameter',
                          method: 'first'
                      },
                      {
                          expression: 'position.speed',
                          name: 'avg.speed',
                          type: 'expression',
                          method: 'average'
                      },
                      {
                          expression: 'position.speed',
                          name: 'max.speed',
                          type: 'expression',
                          method: 'maximum'
                      },
                      {
                          name: 'address.start',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'first'
                      },
                      {
                          name: 'address.end',
                          type: 'parameter',
                          parameter: 'gisgraphy.address.formatedPostal',
                          method: 'last'
                      },
                      {
                          name: 'route',
                          type: 'route'
                      },
                      {
                          name: 'points',
                          type: 'message',
                          method: 'each',
                          fields: [
                              'timestamp',
                              'position.latitude',
                              'position.longitude',
                              'position.altitude',
                              'position.speed',
                              'position.satellites',
                              'movement.status',
                              'engine.ignition.status',
                              'battery.level',
                              'external.powersource.status',
                              'external.powersource.voltage',
                              'gsm.signal.level',
                              'ibutton.code',
                              'vehicle.mileage',
                              'ident',
                              'gisgraphy.address.formatedPostal',
                              'gisgraphy.address.lanes'
                          ],
                          validate_message: ''
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_start',
                          type: 'expression',
                          method: 'first'
                      },
                      {
                          expression: 'vehicle.mileage',
                          name: 'mileage_end',
                          type: 'expression',
                          method: 'last'
                      },
                      {
                          expression: '$mileage_end - $mileage_start',
                          name: 'distance',
                          type: 'interval'
                      },
                      {
                          expression: 'timestamp',
                          name: 'last.active',
                          type: 'expression',
                          method: 'last'
                      }
                  ],
                  timezone: 'Europe/Paris'
              };

        

                        const response = await fetch(`${flespi_url}/configuration.ident="${link?.vehicle?.vehicleDeviceImei}"/calculate`, {
                            method: 'POST',
                            headers: {
                                Authorization: `FlespiToken ${flespi_token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify(request)
                        });

                        // console.log('ana drbt l query',await response.json())

                        if (!response.ok) {
                            console.error(`Request failed for date range: ${currentFromDate} - ${currentToDate}`);
                            continue;
                        }

                        const data = await response.json();
                        console.log(data);

                        data?.result?.forEach((element) => {
                            totalDuration += element.duration;
                        });

                        // Ajouter la durée totale du jour à la liste
                        // if (totalDuration > 0) {
                            dailyDurations.push(totalDuration);
                        // }

                        // Réinitialiser totalDuration pour le jour suivant
                        totalDuration = 0;

                        console.log(totalDuration);
                        // if (data?.result?.[0]?.duration) {
                        //     totalDuration += data.result[0].duration;
                        // }
                    }

                    console.log(`Total Duration: ${totalDuration}`);
                }

                // const request = {
                //   calc_id : calc_id,
                //   from: getStartDate(link?.assignmentDate, startDate),
                //   to: getEndDate(link?.unassignmentDate, endDate)
                // };

                
                let request

                console.log('calc_id',calc_id);
                
         
                if (calc_id === 1695308) {
                  // Préparer la requête avec calc_id fixe et les dates dynamiques
                   request = {
                      // calc_id: 1675320,
                      selectors: [
                       // {
                       //     expression: "engine.ignition.status",
                       //     max_inactive: 180,
                       //     method: "boolean",
                       //     type: "expression"
                       // },
                       {
                           split: "year",
                           type: "datetime"
                       }
                   ],
                   counters: [
                       {
                           method: "first",
                           name: "ident",
                           parameter: "ident",
                           type: "parameter"
                       },
                       {
                           name: "route",
                           type: "route"
                       },
                       {
                           expression: "1",
                           method: "duration",
                           name: "driving_time",
                           type: "expression",
                           validate_message: ""
                       },
                       {
                           expression: "can.vehicle.mileage",
                           method: "first",
                           name: "can_mileage_start",
                           type: "expression"
                       },
                       {
                           expression: "can.vehicle.mileage",
                           method: "last",
                           name: "can_mileage_end",
                           type: "expression"
                       },
                       {
                           expression: "$can_mileage_end - $can_mileage_start",
                           name: "total_can_mileage",
                           type: "interval"
                       },
                       {
                           expression: "vehicle.mileage",
                           method: "first",
                           name: "mileage_start",
                           type: "expression"
                       },
                       {
                           expression: "vehicle.mileage",
                           method: "last",
                           name: "mileage_end",
                           type: "expression"
                       },
                       {
                           expression: "$mileage_end - $mileage_start",
                           name: "total_mileage",
                           type: "interval"
                       },
                       {
                           expression: "can.tracker.counted.fuel.consumed",
                           method: "first",
                           name: "can_fuel_consumed_start",
                           type: "expression"
                       },
                       {
                           expression: "can.tracker.counted.fuel.consumed",
                           method: "last",
                           name: "can_fuel_consumed_end",
                           type: "expression"
                       },
                       {
                           expression: "$can_fuel_consumed_end - $can_fuel_consumed_start",
                           name: "total_can_fuel_consumed",
                           type: "interval"
                       },
                       {
                           expression: "position.speed",
                           method: "average",
                           name: "avg_speed",
                           type: "expression"
                       },
                       {
                           expression: "can.vehicle.speed",
                           method: "average",
                           name: "avg_can_speed",
                           type: "expression"
                       },
                       {
                           expression: "position.speed",
                           method: "maximum",
                           name: "max_speed",
                           type: "expression"
                       },
                       {
                           expression: "can.vehicle.speed",
                           method: "maximum",
                           name: "max_can_speed",
                           type: "expression"
                       },
                       {
                           expression: "$mileage_end - $mileage_start",
                           method: "first",
                           name: "daily_mileage",
                           type: "expression"
                       },
                       {
                           expression: "$can_mileage_end - $can_mileage_start",
                           method: "first",
                           name: "daily_can_mileage",
                           type: "expression"
                       }
                   ],
                      timezone: 'Europe/Paris',
                      // Utilisation des valeurs de from et to avec stringDateToTimestamp
                      from: stringDateToTimestamp(startDate, false),
                      to: stringDateToTimestamp(endDate, true)
                  };
              } else if (calc_id === 1725011) {
       console.log('rani dkhlt l calc');
       
       
            // Préparer la requête avec calc_id fixe et les dates dynamiques
            request = {
             // calc_id: 1675320,
             selectors: [
                 // {
                 //     expression: 'engine.ignition.status',
                 //     max_inactive: 180,
                 //     method: 'boolean',
                 //     type: 'expression'
                 // },
                 {
                     // merge_message_before: true,
                     split: 'day',
                     type: 'datetime'
                 }
             ],
             counters: [
                 {
                     method: 'first',
                     name: 'ident',
                     parameter: 'ident',
                     type: 'parameter'
                 },
                 {
                     name: 'route',
                     type: 'route'
                 },
                 {
                     expression: '1',
                     method: 'duration',
                     name: 'driving_time',
                     type: 'expression',
                     validate_message: ''
                 },
                 {
                     expression: 'can.vehicle.mileage',
                     method: 'first',
                     name: 'can_mileage_start',
                     type: 'expression'
                 },
                 {
                     expression: 'can.vehicle.mileage',
                     method: 'last',
                     name: 'can_mileage_end',
                     type: 'expression'
                 },
                 {
                     expression: '$can_mileage_end - $can_mileage_start',
                     name: 'daily_can_mileage',
                     type: 'interval'
                 },
                 {
                     expression: 'vehicle.mileage',
                     method: 'first',
                     name: 'mileage_start',
                     type: 'expression'
                 },
                 {
                     expression: 'vehicle.mileage',
                     method: 'last',
                     name: 'mileage_end',
                     type: 'expression'
                 },
                 {
                     expression: '$mileage_end - $mileage_start',
                     name: 'daily_mileage',
                     type: 'interval'
                 },
                 {
                     expression: 'can.tracker.counted.fuel.consumed',
                     method: 'first',
                     name: 'can_fuel_consumed_start',
                     type: 'expression'
                 },
                 {
                     expression: 'can.tracker.counted.fuel.consumed',
                     method: 'last',
                     name: 'can_fuel_consumed_end',
                     type: 'expression'
                 },
                 {
                     expression: '$can_fuel_consumed_end - $can_fuel_consumed_start',
                     name: 'total_can_fuel_consumed',
                     type: 'interval'
                 },
                 {
                     expression: 'position.speed',
                     method: 'average',
                     name: 'avg_speed',
                     type: 'expression'
                 },
                 {
                     expression: 'can.vehicle.speed',
                     method: 'average',
                     name: 'avg_can_speed',
                     type: 'expression'
                 },
                 {
                     expression: 'position.speed',
                     method: 'maximum',
                     name: 'max_speed',
                     type: 'expression'
                 },
                 {
                     expression: 'can.vehicle.speed',
                     method: 'maximum',
                     name: 'max_can_speed',
                     type: 'expression'
                 },
                 {
                     counter: 'daily_mileage',
                     name: 'total_mileage',
                     reset_interval: 'day',
                     type: 'accumulator'
                 },
                 {
                     counter: 'driving_time',
                     name: 'total_duration',
                     reset_interval: 'day',
                     type: 'accumulator'
                 }
             ],
             timezone: 'Europe/Paris',
             // interval: 86400, // Regrouper par jour (24 heures),
             // Utilisation des valeurs de from et to avec stringDateToTimestamp
             from: stringDateToTimestamp(startDate, false),
             to: stringDateToTimestamp(endDate, true)
         };
               
              } 
              else if(calc_id === 1713663){
                request = {
                    from: stringDateToTimestamp(startDate, false),
                    to: stringDateToTimestamp(endDate, true),
                    selectors: [
                      {
                        expression: "#can.fuel.volume <can.fuel.volume",
                        max_active: 180,
                        max_inactive: 90,
                        max_messages_time_diff: 1800,
                        merge_message_before: true,
                        method: "boolean",
                        min_duration: 30,
                        name: "fuel increased",
                        type: "expression"
                      }
                    ],
                    // intervals_rotate: 0,
                    counters: [
                      {
                        method: "first",
                        name: "ident",
                        parameter: "ident",
                        type: "parameter"
                      },
                      {
                        method: "first",
                        name: "device.id",
                        parameter: "device.id",
                        type: "parameter"
                      },
                      {
                        method: "first",
                        name: "fuel.before",
                        parameter: "can.fuel.volume",
                        type: "parameter"
                      },
                      {
                        method: "last",
                        name: "fuel.after",
                        parameter: "can.fuel.volume",
                        type: "parameter"
                      },
                      {
                        expression: "fuel.after-fuel.before",
                        name: "fuel.delta",
                        type: "interval"
                      },
                      {
                        method: "first",
                        name: "can.vehicle.mileage",
                        type: "parameter"
                      },
                      {
                        method: "first",
                        name: "position.latitude",
                        type: "parameter"
                      },
                      {
                        method: "first",
                        name: "position.longitude",
                        type: "parameter"
                      },
                      {
                        method: "first",
                        name: "address",
                        parameter: "gisgraphy.address",
                        type: "parameter"
                      }
                    ],
                    timezone: "Europe/Paris",
                    // metadata: {}
                  };
              }
              else {
                  request = {
                      // calc_id: 1675320,
                      // Utilisation des valeurs de from et to avec stringDateToTimestamp
                      from: stringDateToTimestamp(startDate, false),
                      to: stringDateToTimestamp(endDate, true),
                      selectors: [
                          {
                              expression: '$engine.ignition.status',
                              type: 'expression',
                              name: '',
                              max_inactive: 120,
                              max_messages_time_diff: 300,
                              merge_message_after: true,
                              merge_message_before: false,
                              merge_unknown: false,
                              min_duration: 60
                          }
                      ],
                      counters: [
                          {
                              name: 'ident',
                              type: 'parameter',
                              parameter: 'ident',
                              method: 'first'
                          },
                          {
                              name: 'device.id',
                              type: 'parameter',
                              method: 'first'
                          },
                          {
                              expression: 'position.speed',
                              name: 'avg.speed',
                              type: 'expression',
                              method: 'average'
                          },
                          {
                              expression: 'position.speed',
                              name: 'max.speed',
                              type: 'expression',
                              method: 'maximum'
                          },
                          {
                              name: 'address.start',
                              type: 'parameter',
                              parameter: 'gisgraphy.address.formatedPostal',
                              method: 'first'
                          },
                          {
                              name: 'address.end',
                              type: 'parameter',
                              parameter: 'gisgraphy.address.formatedPostal',
                              method: 'last'
                          },
                          {
                              name: 'route',
                              type: 'route'
                          },
                          {
                              name: 'points',
                              type: 'message',
                              method: 'each',
                              fields: [
                                  'timestamp',
                                  'position.latitude',
                                  'position.longitude',
                                  'position.altitude',
                                  'position.speed',
                                  'position.satellites',
                                  'movement.status',
                                  'engine.ignition.status',
                                  'battery.level',
                                  'external.powersource.status',
                                  'external.powersource.voltage',
                                  'gsm.signal.level',
                                  'ibutton.code',
                                  'vehicle.mileage',
                                  'ident',
                                  'gisgraphy.address.formatedPostal',
                                  'gisgraphy.address.lanes'
                              ],
                              validate_message: ''
                          },
                          {
                              expression: 'vehicle.mileage',
                              name: 'mileage_start',
                              type: 'expression',
                              method: 'first'
                          },
                          {
                              expression: 'vehicle.mileage',
                              name: 'mileage_end',
                              type: 'expression',
                              method: 'last'
                          },
                          {
                              expression: '$mileage_end - $mileage_start',
                              name: 'distance',
                              type: 'interval'
                          },
                          {
                              expression: 'timestamp',
                              name: 'last.active',
                              type: 'expression',
                              method: 'last'
                          },
                          {
                           expression: "eco.driving.events.number",
                           method: "last",
                           name: "eco_score",
                           type: "expression"
                         }
                      ],
                      timezone: 'Europe/Paris'
                  };
              }
                 
                const response = await fetch(`${flespi_url}/configuration.ident="${link?.vehicle?.vehicleDeviceImei}"/calculate`, {
                    method: 'POST',
                    headers: {
                        Authorization: `FlespiToken ${flespi_token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(request)
                });


                if (response.ok) {
                    const data = await response.json();
                    let mappedData = null;
                    if (mode.toLowerCase() === 'trajectory_history') mappedData = mapTrajectoryHistory(data['result'], link.vehicle, link.driver);
                    else if (mode.toLowerCase() === 'daily_summary') mappedData = mapDailySummary(data['result'], link.vehicle, link.driver, dailyDurations);
                    else if (mode.toLowerCase() === 'fuel_report') mappedData = fuelReport(data['result'], link.vehicle, link.driver);
                    else mappedData = mapActivityReport(data['result'], link.vehicle, link.driver, totalDuration);
                    result.push(...mappedData);
                }
            }
        }
        return result;
    };
}
