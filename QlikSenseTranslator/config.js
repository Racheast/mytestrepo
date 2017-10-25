module.exports = {
  //source_app_filepath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\MultiLang_TestApp.qvf",
  source_app_filepath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\Übersetzungs-App.qvf",
  //csv_filepath : "./csv/translations.csv",
  csv_filepath : "./csv/label_liste_vorläufig.csv",
  target_app_dirpath : "C:\\Users\\Alex\\Documents\\Qlik\\Sense\\Apps\\",
  qlik_engine_url : "ws://localhost:4848/app/engineData",
  //qlik_targetApp_sheet : 'd6e0c807-e9d5-4d38-bae9-76a4d665dc3e',
  //qlik_targetApp_sheet : "jNdRe",
  
  getTargetAppFileName: function(lang){
	  var target_app_name = "Übersetzungs-App";
	  return target_app_name + "_" + lang + ".qvf";
  },
  
  getTargetAppFilePath: function(lang){
	  return this.target_app_dirpath + this.getTargetAppFileName(lang);
  }
};