module.exports = {
  source_app_filepath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\Live Entertainment (aktuelle Version).qvf",
  csv_filepath : "./csv/KP_label_list_final.CSV",
  target_app_dirpath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\",
  qlik_engine_url : "ws://localhost:4848/app/engineData",
  getTargetAppFilePath: function(lang){
	  return this.source_app_filepath.slice(0,-4) + "_" + lang + ".qvf";
  }
};