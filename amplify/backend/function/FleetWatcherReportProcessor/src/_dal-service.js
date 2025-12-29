import crypto from "@aws-crypto/sha256-js";
import {SignatureV4} from "@aws-sdk/signature-v4";
import {defaultProvider} from "@aws-sdk/credential-provider-node";
import {default as fetch, Request} from "node-fetch";
import {HttpRequest} from "@aws-sdk/protocol-http";
import {
  GET_VEHICLE_QUERY,
  LIST_DVD_BY_DRIVER_QUERY,
  LIST_DVD_BY_VEHICLE_QUERY,
  LIST_VEHICLE_BY_TAG_QUERY
} from "./_queries.js";

const {Sha256} = crypto;
const _signer = new SignatureV4({
  credentials: defaultProvider(),
  region: process.env.AWS_REGION,
  service: 'appsync',
  sha256: Sha256
});

export default class DalService {

  constructor() {
    this.signer = _signer;
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

  getLinksByDriver = async (variables) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const loadDvdByDriverResponse = await this.#loadDvdByDriver(variables);
        if (loadDvdByDriverResponse.status === 'success') {
          items = [...items, ...loadDvdByDriverResponse.data.items];
          nextToken = loadDvdByDriverResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (e) {
      this.#logError('getLinksByDriver', error, `Variables : ${JSON.stringify(variables)}`);
      return {status: 'error'}
    }
  }

  getLinksByVehicle = async (variables) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const loadDvdByVehicleResponse = await this.#loadDvdByVehicle(variables);
        if (loadDvdByVehicleResponse.status === 'success') {
          items = [...items, ...loadDvdByVehicleResponse.data.items];
          nextToken = loadDvdByVehicleResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (e) {
      this.#logError('getLinksByVehicle', error, `Variables : ${JSON.stringify(variables)}`);
      return {status: 'error'}
    }
  }

  listVehiclesByTag = async (tagId) => {
    let items = [];
    let nextToken = null;
    try {
      do {
        const fetchListVehiclesByTagResponse = await this.#fetchListVehiclesByTag(tagId, nextToken);
        if (fetchListVehiclesByTagResponse.status === 'success') {
          items = [...items, ...fetchListVehiclesByTagResponse.data.items];
          nextToken = fetchListVehiclesByTagResponse.data.nextToken;
        }
      } while (nextToken !== null);
      return {
        status: 'success',
        data: items
      }
    } catch (error) {
      this.#logError('listVehiclesByTag', error, `Tag ID : ${tagId}`);
      return {status: 'error'}
    }
  }

  #loadDvdByDriver = async (variables) => {
    const signed = await this.signer.sign(this.#generatePreSignedRequest(LIST_DVD_BY_DRIVER_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('loadDvd', body.errors, `Variables : ${variables}`);
          status = 'error';
        } else {
          body = body.data['dvDSByDvDDriverSub'];
        }
      } catch (error) {
        this.#logError('loadDvd', error, `Variables : ${variables}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  #loadDvdByVehicle = async (variables) => {
    const signed = await this.signer.sign(this.#generatePreSignedRequest(LIST_DVD_BY_VEHICLE_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('loadDvdByVehicle', body.errors, `Variables : ${variables}`);
          status = 'error';
        } else {
          body = body.data['dvDSByDvDVehicleImmat'];
        }
      } catch (error) {
        this.#logError('loadDvdByVehicle', error, `Variables : ${variables}`);
        status = 'error';
        body = {errors: [{message: error.message}]};
      }
      resolve({status, data: body});
    });
  }

  #fetchListVehiclesByTag = async (tagId, nextToken) => {
    const variables = {tagId, nextToken}
    const signed = await this.signer.sign(this.#generatePreSignedRequest(LIST_VEHICLE_BY_TAG_QUERY, variables));
    const request = new Request(this.endpoint, signed);
    return new Promise(async (resolve) => {
      let status = 'success';
      let body;
      try {
        let response = await fetch(request);
        body = await response.json();
        if (body.errors) {
          this.#logError('fetchListVehiclesByTag', body.errors, `Tag ID : ${tagId}`);
          status = 'error';
        } else {
          body = body.data['vehicleTagsByTagId'];
        }
      } catch (error) {
        this.#logError('fetchListVehiclesByTag', error, `Tag ID : ${tagId}`);
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
