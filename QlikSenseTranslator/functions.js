module.exports = {
	getAllObjectsFromLayout: function(app, layout){
		var tasks = [];
		for (var i=0; i<layout.cells.length; i++){
			var cell = layout.cells[i];
			tasks.push(app.getObject({qId:cell.name}));
		}
		return tasks;
	},
	
	getPropertiesForAllObjects: function(objects,objects_received){
		var tasks = [];
		for(var i=0;i<objects_received.length;i++){
			var object = objects_received[i];
			objects[object.id] = object;  //needed for further processing
			tasks.push(object.getProperties());
		}
		return tasks;
	},
	
	getApplyPatchesTasksForObjects: function(objects, propertiesArray, dictionary){
		tasks = [];
		for(var i=0; i<propertiesArray.length; i++){
			var properties = propertiesArray[i];
			var object = objects[properties.qInfo.qId];
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
			
			//check all subnodes of HyperCubeDefs ...
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
				
			}
			if(patches.length > 0){
				tasks.push(object.applyPatches(patches,false));
			}
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
	
	getApplyPatchesTasksForDimensions: function(dimensions, propertiesArray, dictionary){
		tasks = [];
		for(var i=0; i<propertiesArray.length; i++){
			var properties = propertiesArray[i];
			if(properties.qDim.title in dictionary){
				var dimension = dimensions[properties.qInfo.qId];
				var patches = [{
					'qPath': "/qDim/qFieldLabels",
					'qOp': 'replace',
					'qValue': "[\"" + dictionary[properties.qDim.title] + "\"]"
				}];
			tasks.push(dimension.applyPatches(patches));
			}
		}
		return tasks;
	}
}