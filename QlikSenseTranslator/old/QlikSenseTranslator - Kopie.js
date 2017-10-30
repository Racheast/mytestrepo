const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const schema = require('enigma.js/schemas/12.20.0.json');
var config = require('./config');
var functions = require('./functions');
var csv = require("fast-csv");
var dictionary = [];
const langArgs = ["DE", "EN"];
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
		start();
	}else{
		console.log("Invalid arguments! Please use one of the following arguments: " + langArgs + " .");
	}
}else{
	console.log("Invalid command format! Please use the following format: node QlikSenseTranslator.js <language>");
}

async function start() {
	console.log("Starting the application ...");
	await writeDictionary();
	await copyApp();
	var global = await openConnection(session);
	var app = await getApp(global);
	var sheetIds = await getAllSheetIds(app);
	for(var i=0; i<sheetIds.length; i++){
		await translateSheet(app,sheetIds[i]);
	}
	console.log("Closing the session ...");
	session.close();
	
}

function copyApp(){
	return new Promise(resolve => {
		console.log("Copying " + config.source_app_filepath + " into " + config.getTargetAppFilePath(langChoice) + " ...");
		var streams = fs.createReadStream(config.source_app_filepath).pipe(fs.createWriteStream(config.getTargetAppFilePath(langChoice)));
	 	streams.on('finish', function () {
			console.log("Copying finished.\n");
			resolve();
		});
	});
}

function writeDictionary(){
	return new Promise(resolve => {
		csv
		 .fromPath(config.csv_filepath, {delimiter: ';'})
		 .on("data", function(data){
			if(langChoice == "DE"){
				console.log("Writing dictionary: [" + data[0] + "]");
				dictionary[data[0]] = data[1];
			}else if(langChoice == "EN"){
				console.log("Writing dictionary: [" + data[0] + "]");
				dictionary[data[0]] = data[2];
			}
			
		 })
		 .on("end", function(){  	
			console.log("Writing dictionary: finished");
			resolve();
		})
	});
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

function getAllSheetIds(app){
	return new Promise(resolve => {
		console.log("Starting getAllSheetIds() ...");
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
		var sheet;
		console.log("Trying to get sheet with id " + sheetId);
		app.getObject({qId:sheetId})
		.then((sheet_received) => {  //sheet
				sheet = sheet_received;
				console.log("Sheet " + sheet.id + " received.");
				console.log("Trying to getProperties() for sheet ...");
				return sheet.getProperties();
		})
		.then((properties) => {
			console.log("Properties received.");
			console.log("Trying to apply patches on sheet ...");
			var patches = functions.getApplyPatchesTaskForSheet(properties,dictionary);
			if(patches.length > 0){	
				return sheet.applyPatches(functions.getApplyPatchesTaskForSheet(properties,dictionary));
			}
		})
		.then(() => {
			return sheet.getLayout();
		})
		.then((layout) => {
				console.log("Layout received.");
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
