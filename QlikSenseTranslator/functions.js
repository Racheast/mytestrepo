module.exports = {
	getSheetListProperties: function(){
		var sheetListProperties =	{
				"qInfo": {
					"qType": "SheetList"
				},
				"qAppObjectListDef": {
					"qType": "sheet",
					"qData": {
						"title": "/qMetaDef/title",
						"description": "/qMetaDef/description",
						"thumbnail": "/thumbnail",
						"cells": "/cells",
						"rank": "/rank",
						"columns": "/columns",
						"rows": "/rows"
					}
				}
					
		};
		
		return sheetListProperties;
	},
	
	getSheetsFromSheetListLayout: function(app,layout) {
		var tasks = [];
		for (var i=0; i < layout.qAppObjectList.qItems.length; i++) {
			item = layout.qAppObjectList.qItems[i];
			tasks.push(app.getObject({qId:item.qInfo.qId}));
		}
		return tasks;
	},
	
	getLayoutForAllSheets: function(sheets_received) {
		var tasks = [];
		for(var i=0; i<sheets_received.length; i++){
			var sheet = sheets_received[i];
			tasks.push(sheet.getLayout());
		}	
		return tasks;
	},
	
	getAllObjectsFromLayout: function(app, layout){
		var tasks = [];
		for (var i=0; i<layout.cells.length; i++){
			var cell = layout.cells[i];
			tasks.push(app.getObject({qId:cell.name}));
		}
		return tasks;
	},
	
	getDimensionListProperties: function(){
		var dimensionListProperties =	{
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
		
		return dimensionListProperties;
	},
	
	getDimensionsFromDimensionListLayout: function(app,layout) {
		var tasks = [];
		for (var i=0; i < layout.qDimensionList.qItems.length; i++) {
			item = layout.qDimensionList.qItems[i];
			tasks.push(app.getDimension({qId:item.qInfo.qId}));
		}
		return tasks;
	},
	
	getPropertiesForAllDimensions: function(dimensions, dimensions_received){
		var tasks = [];
		for (var i=0; i < dimensions_received.length; i++) {
			var dimension = dimensions_received[i];
			dimensions[dimension.id] = dimension;
			tasks.push(dimension.getProperties());
		}
		return tasks;
	},
	
	getApplyPatchesForDimension: function(properties, dictionary){
		var patches = [];
		if(properties.qDim.title in dictionary){
			patches.push(
				{
					'qPath': "/qDim/qFieldLabels",
					'qOp': 'replace',
					'qValue': "[\"" + dictionary[properties.qDim.title] + "\"]"
				},
				{
					'qPath': "/qDim/title",
					'qOp': 'replace',
					'qValue': "\"" + dictionary[properties.qDim.title] + "\""
				},
				{
					"qOp": "replace",
					"qPath": "/qMetaDef/title",
					"qValue": "\"" + dictionary[properties.qDim.title] + "\""
				}	
			);
		}
		return patches;
	},
	
	getApplyPatchesTaskForSheet: function(properties, dictionary){
		var patches = [];
		if(properties.qMetaDef.title in dictionary){
			patches.push(
				{
					'qPath': "/qMetaDef/title",
					'qOp': 'replace',
					'qValue': "\"" + dictionary[properties.qMetaDef.title] + "\""
				}
			);
		}
		if(properties.qMetaDef.description in dictionary){
			patches.push(
				{
					'qPath': "/qMetaDef/description",
					'qOp': 'replace',
					'qValue': "\"" + dictionary[properties.qMetaDef.description] + "\""
				}
			);
		}
		
		return patches;
	},
	
	getApplyPatchesForObject: function(properties, dictionary){
		var patches = [];
			
		if(properties.hasOwnProperty('title')){
			if(properties.title in dictionary) {
				patches.push({
						'qPath': '/title',
						'qOp': 'add',
						'qValue': "\"" + dictionary[properties.title] + "\""
				});		
			}	
		}
		
		//check all layers
		if(properties.hasOwnProperty('layers')){
			for(var i=0; i<properties.layers.length; i++){
				var layer = properties.layers[i];
				
				//check all subnodes of HyperCubeDefs
				if(layer.hasOwnProperty('qHyperCubeDef')){	
					//check all qMeasures
					if(layer.qHyperCubeDef.hasOwnProperty('qMeasures')){
						for(var j=0; j<layer.qHyperCubeDef.qMeasures.length; j++){
							var measure = layer.qHyperCubeDef.qMeasures[j];
							if(measure.hasOwnProperty('qDef') && measure.qDef.hasOwnProperty('qLabel')){
								if(measure.qDef.qLabel in dictionary){
									patches.push({
										"qPath": "/layers/" + i + "/qHyperCubeDef/qMeasures/" + j + "/qDef/qLabel",
										"qOp": "replace",
										"qValue": "\"" + dictionary[measure.qDef.qLabel] + "\""
									});	
								}
							}
						}	
					}
						
					//check all qDimensions
					if(layer.qHyperCubeDef.hasOwnProperty('qDimensions')){	
						for(var j=0; j<layer.qHyperCubeDef.qDimensions.length; j++){
							var dimension = layer.qHyperCubeDef.qDimensions[j];
							if(dimension.hasOwnProperty('qDef') && dimension.qDef.hasOwnProperty('qFieldLabels') && dimension.qDef.qFieldLabels.length == 1){
								if(dimension.qDef.qFieldLabels[0] in dictionary){
									patches.push({
										"qPath" : "/layers/" + i + "/qHyperCubeDef/qDimensions/" + j + "/qDef/qFieldLabels",
										"qOp" : "replace",
										"qValue" : "[\"" + dictionary[dimension.qDef.qFieldLabels[0]] + "\"]"
									});
								}
							}
						}		
					}

					//check customErrorMessage
					if(layer.qHyperCubeDef.hasOwnProperty('customErrorMessage')){
						if(layer.qHyperCubeDef.customErrorMessage.hasOwnProperty('calcCond')){
							if(layer.qHyperCubeDef.customErrorMessage.calcCond in dictionary){
								patches.push({
									"qOp": "replace",
									"qPath": "/layers/" + i + "/qHyperCubeDef/customErrorMessage/calcCond",
									"qValue": "\"" + dictionary[layer.qHyperCubeDef.customErrorMessage.calcCond] + "\""
								});
							}
						}
					}
				}
			}
		}	
		
		//check all subnodes of HyperCubeDefs
		if(properties.hasOwnProperty('qHyperCubeDef')){	
			//check all qMeasures
			if(properties.qHyperCubeDef.hasOwnProperty('qMeasures')){
				for(var j=0; j<properties.qHyperCubeDef.qMeasures.length; j++){
					var measure = properties.qHyperCubeDef.qMeasures[j];
					if(measure.hasOwnProperty('qDef') && measure.qDef.hasOwnProperty('qLabel')){
						if(measure.qDef.qLabel in dictionary){
							patches.push({
								"qPath": "/qHyperCubeDef/qMeasures/" + j + "/qDef/qLabel",
								"qOp": "replace",
								"qValue": "\"" + dictionary[measure.qDef.qLabel] + "\""
							});	
						}
					}
				}	
			}
				
			//check all qDimensions
			if(properties.qHyperCubeDef.hasOwnProperty('qDimensions')){	
				for(var j=0; j<properties.qHyperCubeDef.qDimensions.length; j++){
					var dimension = properties.qHyperCubeDef.qDimensions[j];
					if(dimension.hasOwnProperty('qDef') && dimension.qDef.hasOwnProperty('qFieldLabels') && dimension.qDef.qFieldLabels.length == 1){
						if(dimension.qDef.qFieldLabels[0] in dictionary){
							patches.push({
								"qPath" : "/qHyperCubeDef/qDimensions/" + j + "/qDef/qFieldLabels",
								"qOp" : "replace",
								"qValue" : "[\"" + dictionary[dimension.qDef.qFieldLabels[0]] + "\"]"
							});
						}
					}
				}		
			}

			//check customErrorMessage
			if(properties.qHyperCubeDef.hasOwnProperty('customErrorMessage')){
				if(properties.qHyperCubeDef.customErrorMessage.hasOwnProperty('calcCond')){
					if(properties.qHyperCubeDef.customErrorMessage.calcCond in dictionary){
						patches.push({
							"qOp": "replace",
							"qPath": "/qHyperCubeDef/customErrorMessage/calcCond",
							"qValue": "\"" + dictionary[properties.qHyperCubeDef.customErrorMessage.calcCond] + "\""
						});
					}
				}
			}
		}
			
		//needed for sheet	
		if(properties.hasOwnProperty('qMetaDef')){
			if(properties.qMetaDef.hasOwnProperty('title')){
				if(properties.qMetaDef.title in dictionary){
					patches.push(
						{
							'qPath': "/qMetaDef/title",
							'qOp': 'replace',
							'qValue': "\"" + dictionary[properties.qMetaDef.title] + "\""
						}
					);
				}
			}
			if(properties.qMetaDef.hasOwnProperty('description')){
				if(properties.qMetaDef.description in dictionary){
					patches.push(
						{
							'qPath': "/qMetaDef/description",
							'qOp': 'replace',
							'qValue': "\"" + dictionary[properties.qMetaDef.description] + "\""
						}
					);
				}
			}
		}
		
		//check refLine
		if(properties.hasOwnProperty('refLine')){
			//check refLinesX
			if(properties.refLine.hasOwnProperty('refLinesX')){
				for(var i=0;i<properties.refLine.refLinesX.length;i++){
					var refLineX = properties.refLine.refLinesX[i];
					if(refLineX.hasOwnProperty('label')){
						if(refLineX.label in dictionary){
							patches.push({
								"qOp": "replace",
								"qPath": "/refLine/refLinesX/"+i+"/label",
								"qValue": "\"" + dictionary[refLineX.label] + "\""
							});
						}
					}
				}
			}
			//check refLinesY
			if(properties.refLine.hasOwnProperty('refLinesY')){
				for(var i=0;i<properties.refLine.refLinesY.length;i++){
					var refLineY = properties.refLine.refLinesY[i];
					if(refLineY.hasOwnProperty('label')){
						if(refLineY.label in dictionary){
							patches.push({
								"qOp": "replace",
								"qPath": "/refLine/refLinesY/"+i+"/label",
								"qValue": "\"" + dictionary[refLineY.label] + "\""
							});
						}
					}
				}
			}
		}
		
		return patches;
	},
	
	getMeasureListProperties: function(){
		return {
			"qInfo": {
				"qType": "MeasureList"
			},
			"qMeasureListDef": {
				"qType": "measure",
				"qData": {
					"title": "/title",
					"tags": "/tags"
				}
			}
		}
	},
	
	getMeasuresFromMeasureListLayout: function(app,layout) {
		var tasks = [];
		for (var i=0; i < layout.qMeasureList.qItems.length; i++) {
			item = layout.qMeasureList.qItems[i];
			tasks.push(app.getMeasure({qId:item.qInfo.qId}));
		}
		return tasks;
	},
	
	getApplyPatchesForMeasure: function(properties, dictionary){
		var patches = [];
		if(properties.qMetaDef.title in dictionary){
			patches.push(
				{
					'qPath': "/qMetaDef/title",
					'qOp': 'replace',
					'qValue': "\"" + dictionary[properties.qMetaDef.title] + "\""
				}
			);
		}
		return patches;
	}
}