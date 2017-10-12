module.exports = {
  source_app_filepath : "\\\\gmm.local\\Daten\\Roaming$\\alexander.eigner\\Eigene Dateien\\Qlik\\Sense\\Apps\\MultiLang_TestApp.qvf",
  csv_filepath : "./csv/translations.csv",
  qvf_dir : "\\\\gmm.local\\Daten\\Roaming$\\alexander.eigner\\Eigene Dateien\\Qlik\\Sense\\Apps\\",
  qlik_engine_url : "ws://localhost:4848/app/engineData",
  qlik_targetApp_sheet : 'd6e0c807-e9d5-4d38-bae9-76a4d665dc3e',
  getTargetAppFileName: function(lang){
	  var target_app_name = "MyTestApp";
	  return target_app_name + "_" + lang + ".qvf";
  }
};