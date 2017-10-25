const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const schema = require('enigma.js/schemas/12.20.0.json');

var config = require('./config');
var functions = require('./functions');
var csv = require("fast-csv");

var dictionary = [];
const langArgs = ["DE"];
var langChoice;

const session = enigma.create({
  schema,
  url: config.qlik_engine_url, 
  createSocket: url => new WebSocket(url)
});

session.on('traffic:sent', data => console.log('sent:', data));
session.on('traffic:received', data => {
	console.log('received:', data);
});

if(process.argv.length == 3 ){
	langChoice = process.argv[2];

	if(langArgs.indexOf(langChoice)>-1){		
		startApp();
	}else{
		console.log("Invalid arguments! Please use one of the following arguments: " + langArgs + " .");
	}
}else{
	console.log("Invalid command format! Please use the following format: node QlikSenseTranslator.js <language>");
}

function startApp(){   
	csv
	 .fromPath(config.csv_filepath)
	 .on("data", function(data){
		if(langChoice == "DE"){
			console.log("Writing dictionary: [" + data[0] + "]");
			dictionary[data[0]] = data[2];
		}
		
	 })
	 .on("end", function(){  	//initiate subsequent translation logic here
		console.log("Writing dictionary: finished");
		console.log("Copying " + config.source_app_filepath + " into " + config.target_app_dirpath + config.getTargetAppFileName(langChoice) + " ...");
		
		var streams = fs.createReadStream(config.source_app_filepath).pipe(fs.createWriteStream(config.target_app_dirpath + config.getTargetAppFileName(langChoice)));
	 	streams.on('finish', function () {
			console.log("Copying finished.\n");
			initTranslation();
		});
	})
}

async function initTranslation() {
	console.log("starting f2");
	var global = await openConnection(session);
	var app = await getApp(global);
	var sheetIds = await getAllSheets(app);
	
	for(var i=0; i<sheetIds.length; i++){
		await translateSheet(app,sheetIds[i]);
	}
	
	console.log("Closing the session ...");
	
	session.close();
}

function openConnection(s){
	return new Promise(resolve => {
		console.log("Starting openConnection ...");
		s.open()
		.then((global)=>{
			console.log("Connection successful.\nReturning global object ...");
			resolve(global);
		})
	});
}

function getApp(global){
	return new Promise(resolve => {
		console.log("Starting getApp ...");
		global.openDoc(config.getTargetAppFilePath(langChoice), '', '', '', false)
		.then((app) => {
			console.log("App received.\nReturning app object ...");
			resolve(app);
		})
	});
}

function getAllSheets(app){
	return new Promise(resolve => {
		console.log("Starting getAllSheets() ...");
		console.log("Trying to create sheetlist ...");
		var sheetIds = [];
		app.createSessionObject(functions.getSheetListProperties())
		.then((sheetList) => {
			console.log("Sheet list received ...");
			console.log("Trying to get layout from sheet list ...");
			return sheetList.getLayout();
		})
		.then((layout) => {
			for(var i=0; i<layout.qAppObjectList.qItems.length; i++){
				var qItem = layout.qAppObjectList.qItems[i];
				sheetIds.push(qItem.qInfo.qId);
			}
		})
		.then(() => {
			console.log("getAllSheets() finished.\n");
			resolve(sheetIds);
		})
		.catch(function (error) {
				console.log(error);
				console.log("getSheetIds has not finished successfully!");
				resolve(sheetIds);
		});
	});
}

function translateSheet(app,sheetId) {
	return new Promise(resolve => {
		console.log("Starting translateSheets() for sheetId " + sheetId + " ... ");

		var objects = [];  //needed for further processing
		var dimensions = [];  //needed for further processing
		
		console.log("Trying to get sheet with id " + sheetId);
		app.getObject({qId:sheetId})
		.then(function (sheet) {  //sheet
				console.log("Sheet " + sheet.id + " received.");
				console.log("Trying to getLayout() from sheet ...");
				return sheet.getLayout();
		}).then(function(layout) {
				console.log("Layout received");
				console.log("Trying to get all objects from layout ...");
				return Promise.all(functions.getAllObjectsFromLayout(app, layout));
		}).then((objects_received) => {
				console.log("All objects received.");
				console.log("Trying to getProperties() of all objects");
				return Promise.all(functions.getPropertiesForAllObjects(objects,objects_received));
		})
		.then((propertiesArray) => {
			console.log("All properties received.");
			console.log("Trying to apply object patches ...");
			return Promise.all(functions.getApplyPatchesTasksForObjects(objects,propertiesArray,dictionary));
		})
		.then(() => {
			console.log("Trying to create dimension list ...");
			return app.createSessionObject(functions.getDimensionListProperties());
		})
		.then((dimensionList) => {
			console.log("Dimension list created.");
			console.log("Trying to getLayout() from dimension list ...");
			return dimensionList.getLayout();
		})
		.then((layout) => {
			console.log("Layout received.");
			console.log("Trying to get all dimensions ...");
			return Promise.all(functions.getDimensionsFromDimensionListLayout(app,layout));
		})
		
		.then((dimensions_received) => {
			console.log("All dimensions received.");
			console.log("Trying to getProperties() for all dimensions ...");
			return Promise.all(functions.getPropertiesForAllDimensions(dimensions, dimensions_received));
		})
		.then((propertiesArray) => {
			console.log("All properties received.");
			console.log("Trying to apply dimension patches ...");
			return Promise.all(functions.getApplyPatchesTasksForDimensions(dimensions,propertiesArray,dictionary));
		})

		.then(() => {
			console.log("Trying doSave() ...");
			return app.doSave();
		})
		.then(() => {
			resolve();
		})
		.catch(function (error) {
				console.log(error);
				console.log("Translation has not finished successfully!\nClosing the session ...\n");
				session.close();
		});
	});
}


// old code //////////////

/*
function getAllSheets(){
	console.log("Starting getAllSheets() ...");
	var sheetIds = [];
	var app, global;
	session.open()
	.then((global_received) => {
		console.log("Connection successful.");
		global = global_received;
		return global.openDoc(config.getTargetAppFilePath(langChoice), '', '', '', false);
	})
	.then((app_received) => {
		console.log("Target app opened successfully.");
		console.log("Trying to create sheetlist ... ");
		app = app_received;
		return app.createSessionObject(functions.getSheetListProperties());
	})
	.then((sheetList) => {
		console.log("Sheet list received ...");
		console.log("Trying to get layout from sheet list ...");
		return sheetList.getLayout();
	})
	.then((layout) => {
		for(var i=0; i<layout.qAppObjectList.qItems.length; i++){
			var qItem = layout.qAppObjectList.qItems[i];
			sheetIds.push(qItem.qInfo.qId);
		}
	}).then(() => {
		console.log("getAllSheets() finished.\n");
		
		if(sheetIds.length > 0){
			translateSheets(session,global,app,sheetIds);
		}else{
			console.log("No sheets were found in the app.\nClosing the session ...\n");
			session.close();
		}
	})
	.catch(function (error) {
            console.log(error);
			console.log("getSheetIds has not finished successfully!\nClosing the session ...\n");
			session.close();
    });
}
*/

/*
function translateSheets(session,global,app,sheetIds) {
	var sheetId = sheetIds.pop();
	console.log("Starting translateSheets() for sheetId " + sheetId + " ... ");
	console.log("Trying to connect to the engine at " + config.qlik_engine_url + " ...");

	var objects = [];  //needed for further processing
	var dimensions = [];  //needed for further processing
	
	
	app.getObject({qId:sheetId})
	.then(function (sheet) {  //sheet
            console.log("Sheet " + sheet.id + " received.");
            console.log("Trying to getLayout() from sheet ...");
			return sheet.getLayout();
    }).then(function(layout) {
			console.log("Layout received");
			console.log("Trying to get all objects from layout ...");
			return Promise.all(functions.getAllObjectsFromLayout(app, layout));
	}).then((objects_received) => {
			console.log("All objects received.");
			console.log("Trying to getProperties() of all objects");
			return Promise.all(functions.getPropertiesForAllObjects(objects,objects_received));
	})
	.then((propertiesArray) => {
		console.log("All properties received.");
		console.log("Trying to apply object patches ...");
		return Promise.all(functions.getApplyPatchesTasksForObjects(objects,propertiesArray,dictionary));
	})
	.then(() => {
		console.log("Trying to create dimension list ...");
		return app.createSessionObject(functions.getDimensionListProperties());
	})
	.then((dimensionList) => {
		console.log("Dimension list created.");
		console.log("Trying to getLayout() from dimension list ...");
		return dimensionList.getLayout();
	})
	.then((layout) => {
		console.log("Layout received.");
		console.log("Trying to get all dimensions ...");
		return Promise.all(functions.getDimensionsFromDimensionListLayout(app,layout));
	})
	
	.then((dimensions_received) => {
		console.log("All dimensions received.");
		console.log("Trying to getProperties() for all dimensions ...");
		return Promise.all(functions.getPropertiesForAllDimensions(dimensions, dimensions_received));
	})
	.then((propertiesArray) => {
		console.log("All properties received.");
		console.log("Trying to apply dimension patches ...");
		return Promise.all(functions.getApplyPatchesTasksForDimensions(dimensions,propertiesArray,dictionary));
	})

	.then(() => {
		console.log("Trying doSave() ...");
		return app.doSave();
	})
	.then(() => {
		if(sheetIds.length>0){
			translateSheets(session,global,app,sheetIds);
		}else{
			console.log("Closing the session ... \n");
			session.close();
		}
	})
	.catch(function (error) {
            console.log(error);
			console.log("Translation has not finished successfully!\nClosing the session ...\n");
			session.close();
    });
}
*/