0.) Make sure Node.js is installed. This application was developed in Node.js v8.8.0 (https://nodejs.org/en/download/)

1.) Open config.js

1.a) Make sure that source_app_filepath equals the path of the application that is to be translated. 
This source app must be located in the qlik/sense/apps directory (i.e. the dir that is used by Qlik Sense Desktop).
Please use the following filepath format: "C:\\Users\\MaxMuster\\Documents\\Qlik\\Sense\\Apps\\MyApplication.qvf"

1.b) specify a target path for the folder that will contain the translated app. Don't specify a target file name (file'll be named automatically).
Use the same filepath format as in 1.a).
e.g.: "C:\\Users\\MaxMuster\\Documents\\Qlik\\Sense\\Apps\\"

1.c) specify a path for the csv file. The csv file should be stored e.g. in the csv folder for convenience. 
Use the following filepath-format: "./csv/mycsv.csv"
WARNING: Make sure that the csv-file is encoded in UTF-8 without BOM !

2.) Make sure that Qlik Sense Desktop is running and an admin user is logged in.

3.) Go to the folder QlikSenseTranslator, press "shift" and "right mouse click" and select the option to open the Command Prompt out of this directory.

4.) Translate the source app: 
(Only "DE", "EN", "FR" are supported so far...)

4.a) Enter the following command for translating the source app to German: 
	node QlikSenseTranslator "DE"

4.b) -,,- to English:
	node QlikSenseTranslator "EN"

4.x) ...
