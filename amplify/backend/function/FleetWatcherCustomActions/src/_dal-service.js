import crypto from "@aws-crypto/sha256-js";
import {SignatureV4} from "@aws-sdk/signature-v4";
import {defaultProvider} from "@aws-sdk/credential-provider-node";
import {default as fetch, Request} from "node-fetch";
import {HttpRequest} from "@aws-sdk/protocol-http";
import {
  CHECK_VEHICLE_ALERT_QUERY,
  CREATE_DVD_QUERY,
  CREATE_VEHICLE_ALERT_QUERY, DELETE_ALERT_QUERY, DELETE_DVD_QUERY,
  DELETE_VEHICLE_ALERT_QUERY, DELETE_VEHICLE_ALERT_STATE_QUERY,
  GET_ALERT_DEFINITION,
  GET_ALERT_QUERY,
  GET_VEHICLE_QUERY, LIST_BUSINESS_ALERTS_QUERY,
  SCHEDULED_ASSIGNMENTS_QUERY,
  UPDATE_DVD_QUERY, VEHICLE_ALERTS_BY_ALERT_QUERY
} from "./_queries.js";

const {Sha256} = crypto;

export default class DalService {

  constructor() {
    this.signer = new SignatureV4({
      credentials: defaultProvider(), region: process.env.AWS_REGION, service: 'appsync', sha256: Sha256
    });
    this.endpoint = new URL(process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIENDPOINTOUTPUT);
  }

  getVehicle = async (immat) => {
    const variables = {immat};
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_VEHICLE_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getVehicle', body.errors, `Vehicle Immat : ${immat}`);
        } else {
          body = body.data['getVehicle'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getVehicle', error, `Vehicle Immat : ${immat}`);
      }
      resolve({status, data: body});
    });
  }

  getAlert = async (id) => {
    const variables = {id};
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_ALERT_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getAlert', body.errors, `ID : ${id}`);
        } else {
          body = body.data['getAlert'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getAlert', error, `ID : ${id}`);
      }
      resolve({status, data: body});
    });
  }

  getAlertDefinition = async (key) => {
    const variables = {key};
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_ALERT_DEFINITION, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getAlertDefinition', body.errors, `Key : ${key}`);
        } else {
          body = body.data['getAlertDefinition'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getAlertDefinition', error, `Key : ${key}`);
      }
      resolve({status, data: body});
    });
  }

  saveDvd = async (input, isCreation) => {
    const variables = { input };
    const query = isCreation ? CREATE_DVD_QUERY : UPDATE_DVD_QUERY;
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
          this.#logError('saveDvd', body.errors, input);
        } else {
          body = body.data[isCreation ? 'createDvD' : 'updateDvD']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('saveDvd', error, input);
      }
      resolve({status, body});
    });
  }

  addVehicleAlert = async (input) => {
    const variables = { input };
    const preSignedRequest = this.#generatePreSignedRequest(CREATE_VEHICLE_ALERT_QUERY, variables)
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
          this.#logError('addVehicleAlert', body.errors, input);
        } else {
          body = body.data['createVehicleAlerts']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('addVehicleAlert', error, input);
      }
      resolve({status, body});
    });
  }

  deleteVehicleAlert = async (id) => {
    const variables = { id };
    const preSignedRequest = this.#generatePreSignedRequest(DELETE_VEHICLE_ALERT_QUERY, variables)
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
          this.#logError('deleteVehicleAlert', body.errors, `Alert Id : ${id}`);
        } else {
          body = body.data['deleteVehicleAlerts']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('deleteVehicleAlert', error, `Alert Id : ${id}`);
      }
      resolve({status, body});
    });
  }

  deleteDvd = async (id) => {
    const variables = { id };
    const preSignedRequest = this.#generatePreSignedRequest(DELETE_DVD_QUERY, variables)
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
          this.#logError('deleteDvd', body.errors, `DvD Id : ${id}`);
        } else {
          body = body.data['deleteDvD']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('deleteDvd', error, `DvD Id : ${id}`);
      }
      resolve({status, body});
    });
  }

  checkVehicleAlertExist = async (vehicleImmat, alertId) => {
    const variables = {vehicleImmat, alertId}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(CHECK_VEHICLE_ALERT_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('checkVehicleAlertExist', body.errors, `Vehicle : ${vehicleImmat} Alert : ${alertId}`);
          status = 'error';
        } else {
          body = body.data['listVehicleAlerts']?.items;
        }
      } catch (error) {
        this.#logError('checkVehicleAlertExist', error, `Vehicle : ${vehicleImmat} Alert : ${alertId}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  getDriversSchedule = async (dvDVehicleImmat, assignmentDate) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const fetchAssignedDriversResponse = await this.#fetchAssignedDrivers(dvDVehicleImmat, assignmentDate, nextToken);
        if (fetchAssignedDriversResponse.status === 'success') {
          items = [...items, ...fetchAssignedDriversResponse.data.items];
          nextToken = fetchAssignedDriversResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (e) {
      this.#logError('getDriversSchedule', error, `Vehicle Immat : ${dvDVehicleImmat}, AssignmentDate : ${assignmentDate}`);
      return {status: 'error'}
    }
  }

  listBusinessAlerts = async (vehicleImmat) => {
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

  listVehicleAlertsByAlertId = async (alertId) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const fetchVehicleAlertsByAlertIdResponse = await this.#fetchVehicleAlertsByAlertId(alertId, nextToken);
        if (fetchVehicleAlertsByAlertIdResponse.status === 'success') {
          items = [...items, ...fetchVehicleAlertsByAlertIdResponse.data.items];
          nextToken = fetchVehicleAlertsByAlertIdResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (error) {
      this.#logError('listVehicleAlertsByAlertId', error, `Alert ID : ${alertId}`);
      return {status: 'error'}
    }
  }

  deleteAlert = async (id) => {
    const variables = { id };
    const preSignedRequest = this.#generatePreSignedRequest(DELETE_ALERT_QUERY, variables)
    const signedHttpRequest = await this.signer.sign(preSignedRequest);
    const request = new Request(this.endpoint, signedHttpRequest);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      let identifier;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('deleteAlert', body.errors, `Alert Id : ${id}`);
        } else {
          identifier = body.data['deleteAlert']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('deleteAlert', error, `Alert Id : ${id}`);
      }
      resolve(identifier ? {status, identifier} : {status, body});
    });
  }

  deleteVehicleAlertState = async (id) => {
    const variables = { id };
    const preSignedRequest = this.#generatePreSignedRequest(DELETE_VEHICLE_ALERT_STATE_QUERY, variables)
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
          this.#logError('deleteVehicleAlertState', body.errors, `Alert Id : ${id}`);
        } else {
          body = body.data['deleteVehicleAlertState']?.id;
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('deleteVehicleAlertState', error, `Alert Id : ${id}`);
      }
      resolve({status, body});
    });
  }

  #fetchListVehicleAlerts = async (vehicleImmat, nextToken) => {
    const variables = {vehicleImmat, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(LIST_BUSINESS_ALERTS_QUERY, variables));
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

  #fetchAssignedDrivers = async (dvDVehicleImmat, assignmentDate, nextToken) => {
    const variables = {dvDVehicleImmat, assignmentDate, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(SCHEDULED_ASSIGNMENTS_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('fetchAssignedDrivers', body.errors, `Vehicle Immat : ${dvDVehicleImmat}, AssignmentDate : ${assignmentDate}`);
          status = 'error';
        } else {
          body = body.data['dvDSByDvDVehicleImmat'];
        }
      } catch (error) {
        this.#logError('fetchAssignedDrivers', error, `Vehicle Immat : ${dvDVehicleImmat}, AssignmentDate : ${assignmentDate}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  #fetchVehicleAlertsByAlertId = async (alertId, nextToken) => {
    const variables = {alertId, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(VEHICLE_ALERTS_BY_ALERT_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('fetchVehicleAlertsByAlertId', body.errors, `Alert ID : ${alertId}`);
          status = 'error';
        } else {
          body = body.data['vehicleAlertsByAlertId'];
        }
      } catch (error) {
        this.#logError('fetchVehicleAlertsByAlertId', error, `Alert ID : ${alertId}`);
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
