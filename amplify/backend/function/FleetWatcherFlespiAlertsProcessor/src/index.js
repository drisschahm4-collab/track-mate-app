/* Amplify Params - DO NOT EDIT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	ENV
	FUNCTION_FLEETWATCHERNOTIFIER_NAME
	REGION
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import {InvokeCommand, LambdaClient} from "@aws-sdk/client-lambda";
import DalService from "./_dal-service.js";
import {buildAlertRecord, flattenObject, replaceVariables} from "./_utils.js";

const dalService = new DalService();
const lambdaClient = new LambdaClient({region: String(process.env.AWS_REGION)});

export const handler = async (event, context) => {

  try {
    const ident = event['ident'];
    if (!ident) throw new Error("The IMEI field in the frame is blank.");
    // ᴅᴇᴠɪᴄᴇ
    const getDeviceResponse = await dalService.getDevice(ident);
    if (getDeviceResponse.status === 'error' || !getDeviceResponse.data?.deviceVehicleImmat)
      throw new Error("The box is not linked to a vehicle.");
    const vehicleImmat = getDeviceResponse.data.deviceVehicleImmat;
    // ᴄᴏɴꜰɪɢᴜʀᴇᴅ ᴀʟᴇʀᴛꜱ
    const listVehicleAlertsResponse = await dalService.listVehicleAlerts(vehicleImmat);
    if (listVehicleAlertsResponse.status === 'error') throw new Error("Problem encountered retrieving configured alerts.");
    else if (!listVehicleAlertsResponse.data || listVehicleAlertsResponse.data.length === 0) {
      console.warn("No alert configured.");
      return;
    }
    // ᴀɴʏ ᴍᴀᴛᴄʜɪɴɢ ᴀʟᴇʀᴛ
    const filteredAlerts = listVehicleAlertsResponse.data.filter(item => item.alert.type === event['tag']).map(item => item.alert);
    if (filteredAlerts.lenght === 0) {
      console.info("The raised alert does not match any configured alerts for this vehicle.");
      return;
    }
    // ʀᴇʟᴀᴛɪᴏɴꜱʜɪᴘꜱ
    const getCurrentDVDResponse = await dalService.getCurrentDriver(vehicleImmat, event['begin']);
    let dvd = {};
    if (getCurrentDVDResponse.status === 'error') console.warn(`Unable to retrieve active DVD for the vehicle ${vehicleImmat}`);
    else if (getCurrentDVDResponse.data) dvd = flattenObject(getCurrentDVDResponse.data);
    else dvd = flattenObject(getDeviceResponse.data);

    // ᴘʀᴏᴄᴇꜱꜱɪɴɢ ᴀʟᴇʀᴛꜱ
    for (const alertConfig of filteredAlerts) {
      const input = {
        FunctionName: process.env.FUNCTION_FLEETWATCHERNOTIFIER_NAME,
        InvocationType: 'Event',
        Payload: JSON.stringify({
          alertId: alertConfig.id,
          driver: {
            phone: dvd['driver_mobile'],
            email: dvd['driver_email']
          },
          alertHistory: buildAlertRecord(alertConfig.id, event, dvd),
          smsContent: replaceVariables(alertConfig.smsTemplate, dvd),
          emailContent: replaceVariables(alertConfig.emailTemplate, dvd)
        }),
      };
      const command = new InvokeCommand(input);
      await lambdaClient.send(command);
    }
  } catch (error) {
    console.info(`EVENT: ${JSON.stringify(event)}`);
    console.error(error);
  }
};
