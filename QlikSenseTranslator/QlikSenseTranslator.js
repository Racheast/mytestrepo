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
const langChoice = process.argv[2];

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
	if(langArgs.indexOf(langChoice)>-1){		
		start();
	}else{
		console.log("Invalid arguments! Please use one of the following arguments: " + langArgs + " .");
	}
}else{
	console.log("Invalid command format! Please use the following format: node QlikSenseTranslator.js <language>");
}

function start(){ 
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
			console.log("Copying finished.");
			translate();
		});
	})
}

function translate() {
	console.log("Trying to connect to the engine at " + config.qlik_engine_url + " ...");
	var app, global;
	var objects = [];  //needed for further processing
	var dimensions = [];  //needed for further processing
	
	session.open()
	.then(function (global_received) {
		console.log("Connection successful.");
		global = global_received;		
		console.log("Trying to open the target app ...");
		return global.openDoc(config.getTargetAppFilePath(langChoice), '', '', '', false);
	}).then(function (app_received) {
		console.log("Target app opened successfully.");
		app = app_received;
		console.log("Trying to get sheet " + config.qlik_targetApp_sheet + " ...");
		
		/*
		  GET ALL SHEETS HERE AND ITERATE OVER EACH
		*/
		//return app.getObject({ qId: config.qlik_targetApp_sheet });
		console.log("Trying to create sheet list ...");
		return app.createSessionObject(functions.getSheetListProperties());
	})
	
	.then((sheetList) => {
		console.log("Sheet list received ...");
		console.log("Trying to get layout from sheet list ...");
		return sheetList.getLayout();
	})
	
	.then((layout) => {
		console.log("Sheet list layout received.");
		console.log("Trying to get all sheets ...");
		return Promise.all(functions.getSheetsFromSheetListLayout(app,layout));
	})
	
	.then((sheets_received) => {
		console.log("All sheets received.");
		console.log("Starting to process each sheet ...");
		
	})
	
	/* WORKING CODE, COMMENT IN LATER !
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

	*/
	
	.then(() => {
		console.log("Trying doSave() ...");
		return app.doSave();
	})
	.then(() => {
		console.log("Closing the session ...");
		session.close();	
	})
	.catch(function (error) {
            console.log(error);
			console.log("Translation has not finished successfully!\nClosing the session ...");
			session.close();
    });
}