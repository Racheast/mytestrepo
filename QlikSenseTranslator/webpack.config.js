module.exports = {  
  entry: './QlikSenseTranslator.js',  
  output: {  
    path: __dirname,  
    filename: 'bundle.js'  
  },  
  devtool: 'source-map',  
  module: {  
    loaders: [  
      {  
        exclude: /(node_modules)/,  
        loader: 'babel-loader',  
        query: {  
          presets: ['es2015']  
        }  
      }  
    ]  
  }  
}