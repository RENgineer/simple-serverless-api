/**
 * Demonstrates a simple HTTP endpoint using API Gateway.
 * 
 * A GET request containing a table name is required to access the DynamoDB
 * table(s) containing either IP or domain info using the tableName query
 * string parameter.
 */

//define required constants
const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();

//begin the arrow function for handling event ingestion
exports.handler = async (event, context) => {
    //console.log('Received event:', JSON.stringify(event, null, 2));
    
    //initialize the response object;
    let response = {
        requestType: 'null',
        statusCode:'null',
        headers:'null',
        body:'null',
    };
    
    //configure default response information
    response.statusCode = '200';
    let headers = 'Content-Type: application/json';
        
    //shorten variable names for readability 
    let ip = JSON.stringify(event.queryStringParameters.ipAddress);
    let splitIp = ip.split(".");
    let hostID = parseInt(splitIp[splitIp.length-1]);
    let dom = JSON.stringify(event.queryStringParameters.domain);
    let splitDom = dom.split(".");
    let tld = splitDom[splitDom.length - 1];
    
    //determine the type of data being passed in for the response to ensure that it is valid and that at least one domain
    //or IP is passed into the event
    if ((ip != "" && ip != null) || (dom != "" && dom != null) ) {
        //ensure that the data is actually formatted as an IP
        if (ip.length <= 15 && typeof hostID === "number" && hostID <= 255) {
            response.requestType = 'IP';
        //ensure that the data is actually formatted as a domain
        } else if (tld.length <= 4 && typeof tld === "string") {
            response.requestType = 'Domain';
        } else {
            response.requestType = 'Invalid entry';
            response.statusCode = '400';
        }
    } else {
        response.statusCode = '400';
    }
    
    //continue with the request
    if (response.statusCode != '400') try {
        //attempt the GET request to retrieve enrichment data, reject all other requests since they're unnecessary
        if (event.httpMethod == 'GET') {
            response.body = await dynamo.scan({ tableName: event.queryStringParameters.tableName }).promise();
        } else {
            response.statusCode = '405';
            headers = [headers, 'Allow: GET'].join(', '); 
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
               
    } catch (err) {
        if (err.message == 'Requested resource not found') {
            response.statusCode = '404';
        }
        response.body = err.message;
    } finally {
        response.headers = headers;
        response.body = JSON.stringify(response.body);
    }
    return response;
};
