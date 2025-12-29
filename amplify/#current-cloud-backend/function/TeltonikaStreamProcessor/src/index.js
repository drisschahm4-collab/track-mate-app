
/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	FUNCTION_FLEETWATCHERCUSTOMACTIONS_NAME
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */

import DalService from "./_dal-service.js";
import {buildTrameRequest, dateToAWSDateTime, flattenObject, toISOString} from "./_tools.js";
import {InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";

const dalService = new DalService();
const lambdaClient = new LambdaClient({region: String(process.env.AWS_REGION)});

const assignDriver = async (driverSub, vehicleImmat, timestamp) => {
  const input = {
    FunctionName: process.env.FUNCTION_FLEETWATCHERCUSTOMACTIONS_NAME,
    InvocationType: 'Event',
    Payload: JSON.stringify({
      arguments: {
        operation: 'link_conductor_vehicle',
        request: {
          assignmentDate: toISOString(timestamp),
          vehicleImmat,
          driverSub
        }
      }
    })
  };
  const command = new InvokeCommand(input);
  await lambdaClient.send(command);
};

export const handler = async (event) => {
  const ident = event['ident'];
  // const sim = event['gsm_sim_iccid'];
  const sim = event?.['gsm_sim_iccid'];
  console.log('ident',ident)
  console.log('sim',ident)
  const trameTimestamp = new Date(event['timestamp'] * 1000);
  const getTrameResponse = await dalService.getTrame(ident);
  if (getTrameResponse.status === 'success') {
    const trameExists = getTrameResponse.data !== null;
    console.log('trameExists',trameExists)
    const trame = trameExists ? getTrameResponse.data : null;
    if (!trameExists || trameTimestamp > new Date(getTrameResponse.data['timestamp'])) {
      const getDeviceResponse = await dalService.getDevice(ident);
      if (getDeviceResponse.status === 'success' && getDeviceResponse.data !== null) {
        let variables = {};
        variables = {...variables, ...flattenObject(getDeviceResponse.data)};
        if (trame.company?.keyedStart !== true) {
          const getCurrentDriverResponse = await dalService.getCurrentDriver(variables['vehicle_immat'], dateToAWSDateTime(trameTimestamp));
          if (getCurrentDriverResponse.status === 'success' && getCurrentDriverResponse.data !== null)
            variables = {...variables, ...flattenObject(getCurrentDriverResponse.data)};
        } 
        if (event['ibutton_code']) {
          const shouldAssignDriver = !trameExists || trame.ibuttonCode !== event['ibutton_code'];
          const getDriverByKeyResponse = await dalService.getDriverByKey(event['ibutton_code']);
          if (getDriverByKeyResponse.status === 'success' && getDriverByKeyResponse.data) {
            const driver = getDriverByKeyResponse.data;
            variables = {
              ...variables, ...{
                driver_sub: driver.sub,
                driver_fullname: driver.fullname,
                driver_firstname: driver.firstname,
                driver_lastname: driver.lastname
              }
            };
            if (shouldAssignDriver) {
              await assignDriver(driver.sub, variables['vehicle_immat'], event['timestamp']);
            }
          }
        }
        await dalService.saveTrame(buildTrameRequest(event, variables), trameExists, ident,sim);
      } else
        console.warn(`Unknown device ${ident}.`);
    } else
      console.warn(`History trame ${ident}.`);
  } else
    console.error(`Unable to retrieve the trame ${ident}.`);
};
