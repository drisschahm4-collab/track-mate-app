import crypto from "@aws-crypto/sha256-js";
import {SignatureV4} from "@aws-sdk/signature-v4";
import {defaultProvider} from "@aws-sdk/credential-provider-node";
import {default as fetch, Request} from "node-fetch";
import {HttpRequest} from "@aws-sdk/protocol-http";
import {
  CREATE_ALERT_STATE_QUERY,
  CURRENT_DRIVER_QUERY,
  GET_ALERT_STATE_QUERY,
  GET_DEVICE_QUERY,
  LIST_VEHICLE_ALERTS_QUERY,
  UPDATE_ALERT_STATE_QUERY
} from "./_queries.js";
import {findCurrentAssignment} from "./_utils.js";

const {Sha256} = crypto;

export default class DalService {

  constructor() {
    this.signer = new SignatureV4({
      credentials: defaultProvider(), region: process.env.AWS_REGION, service: 'appsync', sha256: Sha256
    });
    this.endpoint = new URL(process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIENDPOINTOUTPUT);
  }

  getDevice = async (imei) => {
    const variables = {imei};
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_DEVICE_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getDevice', body.errors, `IMEI ID : ${imei}`);
        } else {
          body = body.data['getDevice'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getDevice', error, `IMEI : ${imei}`);
      }
      resolve({status, data: body});
    });
  }

  listVehicleAlerts = async (vehicleImmat) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const fetchListVehicleAlertsResponse = await this.#fetchListVehicleAlerts(vehicleImmat, nextToken);
        if (fetchListVehicleAlertsResponse.status === 'success') {
          items = [...items, ...fetchListVehicleAlertsResponse.data.items];
          nextToken = fetchListVehicleAlertsResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (error) {
      this.#logError('listVehicleAlerts', error, `Vehicle Immat : ${vehicleImmat}`);
      return {status: 'error'}
    }
  }

  getAlertSate = async (alertId, vehicleImmat) => {
    const variables = {id: `${alertId}_${vehicleImmat}`};
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_ALERT_STATE_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getAlertSate', body.errors, `Alert State ID : ${alertId}_${vehicleImmat}`);
        } else {
          body = body.data['getVehicleAlertState'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getAlertSate', error, `Alert State ID : ${alertId}_${vehicleImmat}`);
      }
      resolve({status, data: body});
    });
  }

  saveVehicleAlertState = async (input, isCreation) => {
    const variables = {input};
    const query = isCreation ? CREATE_ALERT_STATE_QUERY : UPDATE_ALERT_STATE_QUERY;
    const preSignedRequest = this.#generatePreSignedRequest(query, variables)
    const signedHttpRequest = await this.signer.sign(preSignedRequest);
    const request = new Request(this.endpoint, signedHttpRequest);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('saveVehicleAlertState', body.errors, input);
        } else {
          body = body.data[isCreation ? 'createVehicleAlertState' : 'updateVehicleAlertState']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('saveVehicleAlertState', error, input);
      }
      resolve({status, body});
    });
  }

  getCurrentDriver = async (dvDVehicleImmat, timestamp) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const fetchAssignedDriversResponse = await this.#fetchAssignedDrivers(dvDVehicleImmat, timestamp, nextToken);
        if (fetchAssignedDriversResponse.status === 'success') {
          items = [...items, ...fetchAssignedDriversResponse.data.items];
          nextToken = fetchAssignedDriversResponse.data.nextToken;
        }
      } while (nextToken !== null);
      if (items.length === 0) return {status: 'success', data: null};
      else if (items.length === 1) return {status: 'success', data: items[0]};
      else return {
          status: 'success',
          data: items.length === 1 ? items[0] : findCurrentAssignment(items)
        }
    } catch (e) {
      this.#logError('getCurrentDriver', error, `Vehicle Immat : ${dvDVehicleImmat}, Timestamp : ${timestamp}`);
      return {status: 'error'}
    }
  }

  #fetchListVehicleAlerts = async (vehicleImmat, nextToken) => {
    const variables = {vehicleImmat, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(LIST_VEHICLE_ALERTS_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('fetchListVehicleAlerts', body.errors, `Vehicle Immat : ${vehicleImmat}`);
          status = 'error';
        } else {
          body = body.data['vehicleAlertsByVehicleImmat'];
        }
      } catch (error) {
        this.#logError('fetchListVehicleAlerts', error, `Vehicle Immat : ${vehicleImmat}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  #fetchAssignedDrivers = async (dvDVehicleImmat, timestamp, nextToken) => {
    const variables = {dvDVehicleImmat, timestamp, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(CURRENT_DRIVER_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('fetchAssignedDrivers', body.errors, `Vehicle Immat : ${dvDVehicleImmat}, Timestamp : ${timestamp}`);
          status = 'error';
        } else {
          body = body.data['dvDSByDvDVehicleImmat'];
        }
      } catch (error) {
        this.#logError('fetchAssignedDrivers', error, `Vehicle Immat : ${dvDVehicleImmat}, Timestamp : ${timestamp}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  #generatePreSignedRequest = (query, variables) => {
    return new HttpRequest({
      method: 'POST',
      headers: {'Content-Type': 'application/json', host: this.endpoint.host},
      hostname: this.endpoint.host,
      body: JSON.stringify({query, variables}),
      path: this.endpoint.pathname
    })
  }

  #logError = (functionName, errors, entry) => {
    console.error(`Function name : ${functionName}`);
    console.error(errors);
    console.error(entry);
  }
}
