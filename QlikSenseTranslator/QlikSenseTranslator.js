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

		var dimensions = [];  //needed for further processing
		console.log("Trying to get sheet with id " + sheetId);
		app.getObject({qId:sheetId})
		.then(async function(sheet){  //translating sheet incl. all of its child-objects
			console.log("Sheet " + sheetId + " received.\nTrying to recursively perform translation-tasks on all objects ... ");
			return Promise.all(await getTranslationTasksForObject(sheet));
		})
		.then(async function(){  //translating all dimensions
			return Promise.all(await getTranslationTasksForDimensions(app));
		})
		.then(async function(){  //translating all measures
			return Promise.all(await getTranslationTasksForMeasures(app));
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

function getTranslationTasksForMeasures(app) {
	return new Promise(async function(resolve){
		var tasks = [];
		var measures = await getMeasures(app);
		for(var i=0; i<measures.length; i++){
			var properties = await (function(measure){
				return new Promise(resolve => {
					console.log("Trying to get properties for measure " + measure.id + " ...");
					measure.getProperties()
					.then((properties) => {
						console.log("Properties for measure " + measure.id + " received.");
						resolve(properties);
					});
				});
			})(measures[i]);
			console.log("Trying to generate patch for measure " + measures[i].id + " ...");
			var patches = functions.getApplyPatchesForMeasure(properties, dictionary);
			if(patches.length > 0){
				tasks.push(measures[i].applyPatches(patches));
			}
		}
		resolve(tasks);
	});
}

function getMeasures(app) {
	return new Promise(resolve => {
		console.log("Trying to create measure list ... ");
		app.createSessionObject(functions.getMeasureListProperties())
		.then((measureList) => {
			console.log("Measure List created.\nTrying to get layout from measureList ...");
			return measureList.getLayout();
		})
		.then((layout) => {
			console.log("Layout received.\Trying to get all measures ...");
			return Promise.all(functions.getMeasuresFromMeasureListLayout(app,layout));
		})
		.then((measures) => {
			resolve(measures);
		});
	});
}

function getTranslationTasksForDimensions(app) {
	return new Promise(async function(resolve){
		console.log("Starting getTranslationTasksForDimensions ...");
		var tasks = [];
		var dimensions = await getDimensions(app);
		for(var i=0; i < dimensions.length; i++){
			var properties = await (function(dimension){
				return new Promise(resolve => {
					console.log("Trying to get properties for dimension " + dimension.id + " ...");
					dimension.getProperties()
					.then((properties) => {
						console.log("Properties for dimension " + dimension.id + " received.");
						resolve(properties);
					});
				});
			})(dimensions[i]);
			
			console.log("Generating patch for dimension " + dimensions[i].id + " ...");
			var patches = functions.getApplyPatchesForDimension(properties, dictionary);
			if(patches.length > 0){
				tasks.push(dimensions[i].applyPatches(patches));
			}
		}
		resolve(tasks);
	});
}

/* WORKING CODE for getProperties(dimension); UNUSED;
function getProperties(dimension){
	return new Promise(resolve => {
		console.log("Trying to get properties for dimension " + dimension.id + " ...");
		dimension.getProperties()
		.then((properties) => {
			console.log("Properties for dimension " + dimension.id + " received.");
			resolve(properties);
		});
	});
}
*/
function getDimensions(app){
	return new Promise(resolve => {
		console.log("Trying to create dimension list ...");
		app.createSessionObject(functions.getDimensionListProperties())
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
		.then((dimensions) => {
			resolve(dimensions);
		});
	});
}

function getTranslationTasksForObject(object){
	return new Promise(resolve => {
		console.log("Starting getTranslationTasksForObject() for object " + object.id + " ...\nTrying to get childInfos ...");
		var tasks = [];
		object.getChildInfos()
		.then(async function(childInfos){
			console.log("childInfos received.\nLooking for child objects ...");
			for(var i=0; i<childInfos.length; i++){
				//var child = await getChild(object, childInfos[i].qId);
				var child = await (function(object,qId){
					return new Promise(resolve => {
						console.log("Trying to get child " + qId + " of object " + object.id + " ...");
						object.getChild(qId)
						.then((child) => {
							console.log("Child " + child.id + " received.");
							resolve(child);
						})
					});
				})(object, childInfos[i].qId);
				tasks.push(await getTranslationTasksForObject(child));
			}
			console.log("Trying to get properties for object " + object.id + " ...");
			return object.getProperties();
		}).then((properties) => {
			console.log("Properties received.\nTrying to generate patches for object " + object.id + " ...");
			var patches = functions.getApplyPatchesForObject(properties, dictionary);	
			if(patches.length > 0){	
				tasks.push(object.applyPatches(patches));
			}
			resolve(tasks);
		});
		
	});
}
/* WORKING CODE; UNUSED;
function getChild(object,qId){
	return new Promise(resolve => {
		console.log("Trying to get child " + qId + " of object " + object.id + " ...");
		object.getChild(qId)
		.then((child) => {
			console.log("Child " + child.id + " received.");
			resolve(child);
		})
	});
}
*/
