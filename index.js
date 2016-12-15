'use strict';


const AWS = require('aws-sdk');
const dynamo = new AWS.DynamoDB.DocumentClient();
const tableName = process.env.TABLE_NAME;

// API Gateway's Lambda proxy integration requires a
// Lambda function to return JSON in this format;
// see the Developer Guide for further details
const createResponse = (statusCode, body) => {
    
    return {
        statusCode: statusCode,
        body: body
    }
};

// API call to create a TODO item

exports.create = (event, context, callback) => {
    
    let params = {
        TableName: tableName,
        Item: JSON.parse(event.body)
    };
    
    let dbPut = (params) => { return dynamo.put(params).promise() };
    
    dbPut(params).then( (data) => {
        console.log(`CREATE ITEM SUCCEEDED FOR todo_id = ${params.Item.todo_id}`);
        callback(null, createResponse(200, `TODO item created with todo_id = ${params.Item.todo_id}\n`));
    }).catch( (err) => { 
        console.log(`CREATE ITEM FAILED FOR todo_id = ${params.Item.todo_id}, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err)); 
    });
};

// API call to retrieve all TODO items

exports.getAll = (event, context, callback) => {
    
    let params = {
        TableName: tableName
    };
    
    let dbGet = (params) => { return dynamo.scan(params).promise() };
    
    dbGet(params).then( (data) => {
        if (!data.Items) {
            callback(null, createResponse(404, 'ITEMS NOT FOUND\n'));
            return;
        }
        console.log(`RETRIEVED ITEMS SUCCESSFULLY WITH count = ${data.Count}`);
        callback(null, createResponse(200, JSON.stringify(data.Items) + '\n') );
    }).catch( (err) => { 
        console.log(`GET ITEMS FAILED, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err));
    });
};

// API calls related to active TODO items

exports.getActive = (event, context, callback) => {
    
    let params = {
        TableName: tableName,
        FilterExpression : 'active = :active',
        ExpressionAttributeValues : {':active' : true}
    };
    
    let dbGet = (params) => { return dynamo.scan(params).promise() };
    
    dbGet(params).then( (data) => {
        if (!data.Items) {
            callback(null, createResponse(404, 'ITEMS NOT FOUND\n'));
            return;
        }
        console.log(`RETRIEVED ITEMS SUCCESSFULLY WITH count = ${data.Count}`);
        callback(null, createResponse(200, JSON.stringify(data.Items) + '\n') );
    }).catch( (err) => { 
        console.log(`GET ITEMS FAILED, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err));
    });
};

exports.updateActive = (event, context, callback) => {
    
    let params = {
        TableName: tableName,
        Item: JSON.parse(event.body)
    };
    
    let dbPut = (params) => { return dynamo.put(params).promise() };
    
    dbPut(params).then( (data) => {
        console.log(`PUT ITEM SUCCEEDED FOR todo_id = ${params.Item.todo_id}`);
        callback(null, createResponse(200, `TODO item updated with todo_id = ${params.Item.todo_id}\n`));
    }).catch( (err) => { 
        console.log(`PUT ITEM FAILED FOR todo_id = ${params.Item.todo_id}, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err)); 
    });
};

// API calls related to complete TODO items

exports.getComplete = (event, context, callback) => {
    
    let params = {
        TableName: tableName,
        FilterExpression : 'active = :active',
        ExpressionAttributeValues : {':active' : false}
    };
    
    let dbGet = (params) => { return dynamo.scan(params).promise() };
    
    dbGet(params).then( (data) => {
        if (!data.Items) {
            callback(null, createResponse(404, 'ITEMS NOT FOUND\n'));
            return;
        }
        console.log(`RETRIEVED ITEMS SUCCESSFULLY WITH count = ${data.Count}`);
        callback(null, createResponse(200, JSON.stringify(data.Items) + '\n') );
    }).catch( (err) => { 
        console.log(`GET ITEMS FAILED, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err));
    });
};

exports.markComplete = (event, context, callback) => {
    
    let item = JSON.parse(event.body);
    item.active = false;

    let params = {
        TableName: tableName,
        Item: item
    };
    
    let dbPut = (params) => { return dynamo.put(params).promise() };
    
    dbPut(params).then( (data) => {
        console.log(`PUT ITEM SUCCEEDED FOR todo_id = ${item.todo_id}`);
        callback(null, createResponse(200, `TODO item marked complete with todo_id = ${item.todo_id}\n`));
    }).catch( (err) => { 
        console.log(`PUT ITEM FAILED FOR todo_id = ${item.todo_id}, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err)); 
    });
};

exports.deleteComplete = (event, context, callback) => {
    
    let params = {
        TableName: tableName,
        FilterExpression : 'active = :active',
        ExpressionAttributeValues : {':active' : false}
    };
    
    // there is no batch delete in the AWS SDK for DynamoDB,
    // so we must delete completed items one by one
    let dbGet = (params) => { return dynamo.scan(params).promise() };
    
    dbGet(params).then( (data) => {
        if (!data.Items) {
            callback(null, createResponse(404, 'NO ITEMS FOUND FOR DELETION\n'));
            return;
        }
        console.log(`NUMBER OF ITEMS TO DELETE = ${data.Count}`);
        let ids = data.Items.map( (item) => { return item.todo_id; });
        ids.forEach( (id) => deleteIndividualItem(id) );
        callback(null, createResponse(200, `${data.Count} items submitted for deletion\n`) );
    }).catch( (err) => { 
        console.log(`GET ITEMS FOR DELETION FAILED, WITH ERROR: ${err}`);
        callback(null, createResponse(500, err));
    });   

};

function deleteIndividualItem(todoId) {
    
    let params = {
        TableName: tableName,
        Key: {
            todo_id: todoId
        },
        ReturnValues: 'ALL_OLD'
    };
    
    let dbDelete = (params) => { return dynamo.delete(params).promise() };
    
    dbDelete(params).then( (data) => {
        if (!data.Attributes) {
            console.log(`ITEM NOT FOUND FOR DELETION WITH ID = ${todoId}`);
            return;
        }
        console.log(`DELETED ITEM SUCCESSFULLY WITH id = ${todoId}`);
    }).catch( (err) => { 
        console.log(`DELETE ITEM FAILED FOR id = ${todoId}, WITH ERROR: ${err}`);
    });
    
}



