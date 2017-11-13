1.) Open config.js
1.a) make sure that source_app_filepath equals the path of the application that is to be translated. 
This source app must be located in the qlik/sense/apps directory (i.e. the dir that is used by qlik sense desktop).
Please use the following filepath format: "C:\\Users\\MaxMuster\\Documents\\Qlik\\Sense\\Apps\\MyApplication.qvf"
1.b) specify a target path for the folder that will contain the translated app. Don't specify a target file name (file'll be named automatically).
Use the same filepath format as in 1.a).
1.c) specify a path for the csv file. The csv file could be stored e.g. in the csv folder. Use the following filepath-format: "./csv/mycsv.csv"
2.) Make sure that Qlik Sense Desktop is running and an admin user is logged in.
3.) In the folder QlikSenseTranslator press shift + right mouse click and select to open the Command Prompt out of this direction.
4.a) Enter the following command for translating the source app to German: 
	node QlikSenseTranslator "DE"

4.b) -,,- to English:
	node QlikSenseTranslator "EN"
