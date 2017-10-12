const enigma = require('enigma.js');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const schema = require('enigma.js/schemas/12.20.0.json');
const langChoice = process.argv[2];
var config = require('./config');
var csv = require("fast-csv");
var dictionary = [];

console.log("language selection: " + langChoice);

const session = enigma.create({
  schema,
  url: config.qlik_engine_url,  //  /engineData
  // Notice the non-standard second parameter here, this is how you pass in
  // additional configuration to the 'ws' npm library, if you use a different
  // library you may configure this differently:
  createSocket: url => new WebSocket(url)
});

session.on('traffic:sent', data => console.log('sent:', data));
session.on('traffic:received', data => {
	console.log('received:', data);
});
 
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
	console.log("Copying " + config.source_app_filepath + " into " + config.qvf_dir + config.getTargetAppFileName(langChoice) + " ...");
	
	var streams = fs.createReadStream(config.source_app_filepath).pipe(fs.createWriteStream(config.qvf_dir + config.getTargetAppFileName(langChoice)));
 	streams.on('finish', function () {
		console.log("Copying finished.");
		translate();
	});
})

function translate() {
	console.log("Trying to connect to the engine at " + config.qlik_engine_url + " ...");
	var app, global;
	var objects = [];
	session.open()
	.then(function (args) {
		console.log("Connection successful.");
		global = args;
		var target_app_filepath = config.qvf_dir + config.getTargetAppFileName(langChoice);
		
		console.log("Trying to open the target app ...");
		return global.openDoc(target_app_filepath, '', '', '', false);
	}).then(function (args) {
		console.log("Target app opened successfully.");
		app = args;
		console.log("Trying to get sheet " + config.qlik_targetApp_sheet + " ...");
		return app.getObject({ qId: config.qlik_targetApp_sheet });
	}).then(function (sheet) {  //sheet
            console.log("Sheet " + sheet.id + " received.");
            console.log("Trying to getLayout() from sheet ...");
			return sheet.getLayout();
    }).then(function(layout) {
			console.log("Layout received");
			console.log("Trying to get all objects from layout ...");
			if(app != undefined){	
				var tasks = [];
				for (var i=0; i<layout.cells.length; i++){
					var cell = layout.cells[i];
					tasks.push(app.getObject({qId:cell.name}));
				}
				return Promise.all(tasks);
			}else{
				console.log("ERROR: app == undefined");
			}	
	}).then((received_objects) => {
			console.log("All objects received.");
			var tasks = [];
			for(var i=0;i<received_objects.length;i++){
				var object = received_objects[i];
				objects[object.id] = object;  //needed for further processing
				tasks.push(object.getProperties());
			}
			console.log("Trying to getProperties() of all objects");
			return Promise.all(tasks);
	})
	.then((propertiesArray) => {
		console.log("All properties received.");
		tasks = [];
		for(var i=0; i<propertiesArray.length; i++){
			var properties = propertiesArray[i];
			if(properties.title in dictionary) {
				var object = objects[properties.qInfo.qId];
				var patches = [{
						'qPath': '/title',
						'qOp': 'add',
						'qValue': "\"" + dictionary[properties.title] + "\""
					}];
				tasks.push(object.applyPatches(patches,false));
			}			
		}
		console.log("Trying to apply title patches ...");
		return Promise.all(tasks);
	})
	.then(() => {
		console.log("Trying to create dimension list ...");
		if(app != undefined) {
			var dimensionListProperties = {
				"qInfo": {
					"qType": "DimensionList"
				},
				"qDimensionListDef": {
					"qType": "dimension",
					"qData": {
						"title": "/title",
						"tags": "/tags",
						"grouping": "/qDim/qGrouping",
						"info": "/qDimInfos"
					}
				}
					
			};
			return app.createSessionObject(dimensionListProperties);
		}else{
			console.log("ERROR: app == undefined");
		}
	})
	.then((dimensionList) => {
		console.log("Dimension list created.");
		console.log("Trying to getLayout() from dimension list ...");
		return dimensionList.getLayout();
	})
	.then((layout) => {
		console.log("Layout received.");
		console.log("Trying to get all dimensions ...");
		if(app != undefined){
			var tasks = [];
			for (var i=0; i < layout.qDimensionList.qItems.length; i++) {
				item = layout.qDimensionList.qItems[i];
				tasks.push(app.getDimension({qId:item.qInfo.qId}));
			}
			return Promise.all(tasks);
		}else{
			console.log("ERROR: app == undefined");
		}
	})
	.then((dimensions) => {
		console.log("All dimensions received.");
		var tasks = [];
		for (var i=0; i < dimensions.length; i++) {
			var dimension = dimensions[i];
			var patches = [{
					'qPath': "/qDim/qFieldLabels",
					'qOp': 'replace',
					'qValue': "[\"SAMPLE LABEL NAME\"]"
				}];
			tasks.push(dimension.applyPatches(patches));	
		}
		return Promise.all(tasks);
	})
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