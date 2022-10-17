/**
 * Demonstrates a simple HTTP endpoint using API Gateway.
 * 
 * A GET request containing a table name is required to access the DynamoDB
 * table Enrichment containing either IP or domain info using the TableName query
 * string parameter.
 */
 
//define required constants
const AWS = require('aws-sdk');
const randomBytes = require('crypto').randomBytes;
const dynamo = new AWS.DynamoDB.DocumentClient();

//begin the arrow function for handling event ingestion
exports.handler = async (event, context,callback) => {
     
    //ensure a user has logged in before performing actions
    if (!event.requestContext.authorizer) {
      errorResponse('Authorization not configured', context.awsRequestId, callback);
      return;
    }
    
    //document the event received
    const enrichmentID = toUrlString(randomBytes(16));
    console.log('Received event (', enrichmentID, '): ', JSON.stringify(event, null, 2));
    
    //pass in the username from the event
    //const username = event.requestContext.authorizer.claims['cognito:username'];
    
    //initialize the response object;
    const response = {
        requestType: 'null',
        statusCode:'null',
        headers:'null',
        body:'null',
    };
    
    //configure default response information
    response.statusCode = '200';
    const headers = 'Content-Type: application/json';
    response.headers = headers;
        
    //shorten variable names for readability 
    const ip = JSON.stringify(event.queryStringParameters.ip);
    const newIp = ip.replace(`\\`,'');
    const newerIp = toString(newIp);
    const splitIp = newerIp.split(".");
    const hostID = parseInt(splitIp[splitIp.length-1]);
    const dom = JSON.stringify(event.queryStringParameters.domain);
    const newDom = dom.replace(`\\`,'');
    const newerDom = toString(newDom);
    const splitDom = newerDom.split(".");
    const tld = splitDom[splitDom.length - 1];
    
    //determine the type of data being passed in for the response to ensure that it is valid and that at least one domain
    if ((ip != "" && ip != null && ip.length != 0) || (dom != "" && dom != null && dom.length)) { try {
        //ensure that the data is actually formatted as an IP
        if (ip.length <= 17 && typeof hostID === "number" && hostID <= 255) {
            response.requestType = 'IP';
        //ensure that the data is actually formatted as a domain
        } else if (tld.length <= 4 && typeof tld === "string" ) {
            response.requestType = 'Domain';
        } else {
            throw new Error('Bad request');
            } 
        }catch (err) {
            response.statusCode = '400';
            err.message = 'Bad request';
            response.requestType = 'Invalid entry';
            response.body = 'Data submitted in improper format';
        }
    } else {
        response.statusCode = '400';
        response.body = 'No IP or domain was submitted';
    }
    
    //continue with the request
    if (response.statusCode != '400') {try {
        //attempt the GET request to retrieve enrichment data, reject all other requests for this use case
        if (event.httpMethod == 'GET') {
            response.body = await dynamo.scan({ TableName: event.queryStringParameters.TableName }).promise();
        } else {
            response.statusCode = '405';
            headers = [headers, 'Allow: GET'].join(', '); 
            throw new Error(`Unsupported method "${event.httpMethod}"`);
        }
               
    } catch (err) {
        if (err.message == 'Requested resource not found') {
            response.statusCode = '404';
            response.body = err.message;
        }
        
    } finally {
    response.headers = headers;
    response.body = JSON.stringify(response.body);
        }
    }
    return response;
    
    function toUrlString(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    }
    
    function toString(buffer) {
    return buffer.toString('base64')
        .replace(/\\/g, '');
    }
    
    function errorResponse(errorMessage, awsRequestId, callback) {
      callback(null, {
        statusCode: 500,
        body: JSON.stringify({
          Error: errorMessage,
          Reference: awsRequestId,
        }),
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
};
