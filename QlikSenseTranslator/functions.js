module.exports = {
	getApplyPatchesTasksForObjectProperties: function(objects, propertiesArray, dictionary){
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
	}
};