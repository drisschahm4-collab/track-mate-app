const { AppSyncClient } = require("@aws-sdk/client-appsync");
const fetch = require("node-fetch");
const { Request } = require("node-fetch");
const queries = require("./_queries");

class DalService {
 constructor() {
   this.appSync = new AppSyncClient({ 
     region: process.env.AWS_REGION
   });
   this.endpoint = process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIENDPOINTOUTPUT;
 }

 async getMaintenance(id) {
   try {
     const variables = { id };
     const request = new Request(this.endpoint, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIKEYOUTPUT
       },
       body: JSON.stringify({
         query: queries.GET_MAINTENANCE_DETAILS,
         variables
       })
     });

     const response = await fetch(request);
     const result = await response.json();

     if (result.errors) {
       console.error('GraphQL Errors:', result.errors);
       return {
         status: 'error',
         data: null
       };
     }

     return {
       status: 'success',
       data: result.data.getMaintenance
     };

   } catch (error) {
     console.error('getMaintenance error:', error);
     return {
       status: 'error',
       data: null
     };
   }
 }

 async updateMaintenanceStatus(maintenanceId, newStatus) {
   try {
     const variables = { 
       id: maintenanceId,
       status: newStatus,
       lastModificationDate: new Date().toISOString()
     };

     const request = new Request(this.endpoint, {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
         'x-api-key': process.env.API_FLEETWATCHERFOAPI_GRAPHQLAPIKEYOUTPUT
       },
       body: JSON.stringify({
         query: queries.UPDATE_MAINTENANCE_STATUS,
         variables
       })
     });

     const response = await fetch(request);
     const result = await response.json();

     if (result.errors) {
       console.error('GraphQL Errors:', result.errors);
       return {
         status: 'error',
         data: null
       };
     }

     return {
       status: 'success',
       data: result.data.updateMaintenance
     };

   } catch (error) {
     console.error('updateMaintenanceStatus error:', error);
     return {
       status: 'error',
       data: null
     };
   }
 }
}

module.exports = DalService;