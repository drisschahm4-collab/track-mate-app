import crypto from "@aws-crypto/sha256-js";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { default as fetch, Request } from "node-fetch";
import { HttpRequest } from "@aws-sdk/protocol-http";
import {
  CREATE_TRAME_QUERY,
  CURRENT_DRIVER_QUERY,
  GET_DEVICE_QUERY,
  UPDATE_DEVICE_MUTATION,
  GET_TRAME_QUERY,
  UPDATE_TRAME_QUERY,
  GET_DRIVER_BY_KEY_QUERY
} from "./_queries.js";
import { findCurrentAssignment } from "./_tools.js";

const { Sha256 } = crypto;

export default class DalService {

  constructor() {
    this.signer = new SignatureV4({
      credentials: defaultProvider(), region: process.env.AWS_REGION, service: 'appsync', sha256: Sha256
    });
    this.endpoint = new URL(process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIENDPOINTOUTPUT);
  }

  getDriverByKey = async (driverKey) => {
    const variables = { driverKey }
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_DRIVER_BY_KEY_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('getDriverByKey', body.errors, `Driver Key : ${driverKey}`);
          status = 'error';
        } else {
          if (body.data['driversByDriverKey'].items.length === 0) {
            body = null;
          } else if (body.data['driversByDriverKey'].items.length === 1) {
            body = body.data['driversByDriverKey'].items[0];
          } else {
            console.warn('Same key used by multiple drivers.');
            body = null;
          }
        }
      } catch (error) {
        this.#logError('getDriverByKey', error, `Driver Key : ${driverKey}`);
        status = 'error';
        body = { errors: [{ message: error.message }] };
      }
      resolve({ status, data: body });
    });
  }

  getTrame = async (id) => {
    const variables = { id };
    const signed = await this.signer.sign(this.#generatePreSignedRequest(GET_TRAME_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          status = 'error';
          this.#logError('getTrame', body.errors, `Trame Ident : ${id}`);
        } else {
          body = body.data['getTrame'];
        }
      } catch (error) {
        status = 'error';
        body = { errors: [{ message: error.message }] };
        this.#logError('getTrame', error, `Trame Ident : ${id}`);
      }
      resolve({ status, data: body });
    });

  }

  getDevice = async (imei) => {
    const variables = { imei };
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
          this.#logError('getDevice', body.errors, `Imei : ${imei}`);
        } else {
          body = body.data['getDevice'];
        }
      } catch (error) {
        status = 'error';
        body = { errors: [{ message: error.message }] };
        this.#logError('getDevice', error, `Imei : ${imei}`);
      }
      resolve({ status, data: body });
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
      console.log(`getCurrentDriver : ${items}`);
      if (items.length === 0) return { status: 'success', data: [] };
      else if (items.length === 1) return { status: 'success', data: items[0] };
      else return {
        status: 'success',
        data: items.length === 1 ? items[0] : findCurrentAssignment(items)
      }
    } catch (e) {
      this.#logError('getCurrentDriver', error, `Vehicle Immat : ${dvDVehicleImmat}, Timestamp : ${timestamp}`);
      return { status: 'error' }
    }
  }

  // saveTrame = async (input, isUpdate, imei) => {
  //   const query = isUpdate ? UPDATE_TRAME_QUERY : CREATE_TRAME_QUERY;
  //   const queryDevice = UPDATE_DEVICE_MUTATION ;
  //   const operation = isUpdate ? 'updateTrame' : 'createTrame';
  //   const operationDevice =  'updateDevice';
  //   const variables = { input };
  //   const variablesDevice = { input: {imei: imei} };
  //   const preSignedRequest = this.#generatePreSignedRequest(query, variables)
  //   const preSignedRequestDevice = this.#generatePreSignedRequest(queryDevice, variablesDevice)
  //   const signedHttpRequest = await this.signer.sign(preSignedRequest);
  //   const signedHttpRequestDevice = await this.signer.sign(preSignedRequestDevice);
  //   const request = new Request(this.endpoint, signedHttpRequest);
  //   return new Promise(async (resolve) => {
  //     let status = 'success';
  //     let body;
  //     try {
  //       let response = await fetch(request);
  //       body = await response.json();
  //       if (body.errors) {
  //         status = 'error';
  //         this.#logError('saveTrame', body.errors, JSON.stringify(input));
  //       } else {
  //         body = body.data[operation].id;
  //       }
  //     } catch (error) {
  //       status = 'error';
  //       body = { errors: [{ message: error.message }] };
  //       this.#logError('saveTrame', error, JSON.stringify(input));
  //     }
  //     resolve({ status, body });
  //   });
  // }

 saveTrame = async (input, isUpdate, imei, sim) => {
  const query = isUpdate ? UPDATE_TRAME_QUERY : CREATE_TRAME_QUERY;
  const queryDevice = UPDATE_DEVICE_MUTATION;
  const operation = isUpdate ? 'updateTrame' : 'createTrame';
  const operationDevice = 'updateDevice';

  const variables = { input };

  const preSignedRequest = this.#generatePreSignedRequest(query, variables);
  const signedHttpRequest = await this.signer.sign(preSignedRequest);
  const request = new Request(this.endpoint, signedHttpRequest);

  return new Promise(async (resolve) => {
    let status = 'success';
    let body;

    try {
      // 1. Save the trame
      const response = await fetch(request);
      const responseBody = await response.json();

      if (responseBody.errors) {
        status = 'error';
        this.#logError('saveTrame', responseBody.errors, JSON.stringify(input));
        resolve({ status, body: null });
        return;
      }

      body = responseBody.data[operation].id;

      // 2. Update the device only if `sim` is not empty
      if (sim && sim.trim() !== '') {
        const variablesDevice = { input: { imei: imei, sim: sim } };
        const preSignedRequestDevice = this.#generatePreSignedRequest(queryDevice, variablesDevice);
        const signedHttpRequestDevice = await this.signer.sign(preSignedRequestDevice);
        const requestDevice = new Request(this.endpoint, signedHttpRequestDevice);

        try {
          const deviceResponse = await fetch(requestDevice);
          const deviceResponseBody = await deviceResponse.json();

          if (deviceResponseBody.errors) {
            this.#logError('saveTrame - updateDevice', deviceResponseBody.errors, `Imei : ${imei}`);
          }
        } catch (deviceError) {
          this.#logError('saveTrame - updateDevice', deviceError, `Imei : ${imei}`);
        }
      }

    } catch (error) {
      status = 'error';
      body = { errors: [{ message: error.message }] };
      this.#logError('saveTrame', error, JSON.stringify(input));
    }

    resolve({ status, body });
  });
};


  #fetchAssignedDrivers = async (dvDVehicleImmat, timestamp, nextToken) => {
    const variables = { dvDVehicleImmat, timestamp, nextToken }
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
        body = { errors: [{ message: error.message }] };
      }
      resolve({ status, data: body });
    });
  }

  #generatePreSignedRequest = (query, variables) => {
    return new HttpRequest({
      method: 'POST',
      headers: { 'Content-Type': 'application/json', host: this.endpoint.host },
      hostname: this.endpoint.host,
      body: JSON.stringify({ query, variables }),
      path: this.endpoint.pathname
    })
  }

  #logError = (functionName, errors, entry) => {
    console.error(`Function name : ${functionName}`);
    console.error(errors);
    console.error(entry);
  }

}
