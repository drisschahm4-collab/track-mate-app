/* Amplify Params - DO NOT EDIT
	ENV
	REGION
	API_FLEETWATCHERFRONT_GRAPHQLAPIIDOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIENDPOINTOUTPUT
	API_FLEETWATCHERFRONT_GRAPHQLAPIKEYOUTPUT
	MJ_SENDER
	MJ_APIKEY_PRIVATE
	MJ_APIKEY_PUBLIC
	TWILIO_APIKEY_PRIVATE
	TWILIO_APIKEY_PUBLIC
	TWILIO_SENDER
Amplify Params - DO NOT EDIT */

/**
 * @type {import('@types/aws-lambda').APIGatewayProxyHandler}
 */
import DalService from "./_dal-service.js";
import ApiService from "./_api-service.js";

const dalService = new DalService();
const apiService = new ApiService();

export const handler = async (event, context) => {

  try {

    const alertId = event['alertId'];
    if (!alertId) throw Error('Alert identifier is not defined.');

    console.log(JSON.stringify(event['alertHistory']));
    const createAlertHistoryResponse = await dalService.createAlertHistory(event['alertHistory']);
    if (createAlertHistoryResponse.status === 'error') throw Error('Unable to historize sent alert');

    const getAlertResponse = await dalService.getAlert(alertId);
    if (getAlertResponse.status === 'error' || !getAlertResponse.data) throw Error('Unable to retrieve alert details.');
    const alert = getAlertResponse.data;

    if (alert.instantaneous === true) {
      if (alert.bySms || alert.byWhatsapp) {
        const phones = alert.phones && alert.phones.length > 0 ? alert.phones : [];
        if (alert.sentToDriver && event['driver']['phone']) phones.push(event['driver']['phone']);
        if (phones && phones.length > 0) {
          if (alert.bySms) await apiService.sendViaSms(phones, event['smsContent']);
          if (alert.byWhatsapp) await apiService.sendViaWhatsapp(phones, event['smsContent']);
        }
      }
      if (alert.byMail) {
        const emails = alert.emails && alert.emails.length > 0 ? alert.emails : [];
        if (alert.sentToDriver && event['driver']['email']) emails.push(event['driver']['email']);
        if (emails && emails.length > 0) await apiService.sendViaMail(emails, event['emailContent']);
      }
    }

  } catch (e) {
    console.error(e);
    console.info(`EVENT: ${JSON.stringify(event)}`);
    // TODO : Implementing a retry system
  }

};
