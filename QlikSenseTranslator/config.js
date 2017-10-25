module.exports = {
  source_app_filepath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\Übersetzungs-App.qvf",
  csv_filepath : "./csv/label_liste_vorläufig.csv",
  target_app_dirpath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\",
  qlik_engine_url : "ws://localhost:4848/app/engineData",
  getTargetAppFilePath: function(lang){
	  return this.source_app_filepath.slice(0,-4) + "_" + lang + ".qvf";
  }
};