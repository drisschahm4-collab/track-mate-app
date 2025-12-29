import crypto from "@aws-crypto/sha256-js";
import {SignatureV4} from "@aws-sdk/signature-v4";
import {defaultProvider} from "@aws-sdk/credential-provider-node";
import {default as fetch, Request} from "node-fetch";
import {HttpRequest} from "@aws-sdk/protocol-http";
import {CREATE_ALERT_HISTORY_QUERY, GET_ALERT_QUERY} from "./_queries.js";

const {Sha256} = crypto;

export default class DalService {

  constructor() {
    this.signer = new SignatureV4({
      credentials: defaultProvider(), region: process.env.AWS_REGION, service: 'appsync', sha256: Sha256
    });
    this.endpoint = new URL(process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIENDPOINTOUTPUT);
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
          this.#logError('getAlert', body.errors, `Alert Configuration ID : ${id}`);
        } else {
          body = body.data['getAlert'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('getAlert', error, `Alert Configuration ID : ${id}`);
      }
      resolve({status, data: body});
    });
  }


  createAlertHistory = async (input) => {
    const variables = { input };
    const preSignedRequest = this.#generatePreSignedRequest(CREATE_ALERT_HISTORY_QUERY, variables)
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
          this.#logError('createAlertHistory', body.errors, input);
        } else {
          body = body.data['createAlertHistory'];
        }
      } catch (error) {
        status = 'error';
        body = {errors: [{message: error.message}]};
        this.#logError('createAlertHistory', error, input);
      }
      resolve({status, body});
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
