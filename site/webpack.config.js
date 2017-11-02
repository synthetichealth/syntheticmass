/* global __dirname */

var CleanPlugin = require('clean-webpack-plugin');
var HtmlWebpackPlugin = require('html-webpack-plugin');
var CopyWebpackPlugin = require('copy-webpack-plugin');
var ExtractTextPlugin = require("extract-text-webpack-plugin");

var extractCSS = new ExtractTextPlugin('stylesheets/[name].css');

var node_env = process.env.NODE_ENV;
var production = (node_env === "production");
var webpack = require('webpack');
var path = require("path");
var dir_js = path.resolve(__dirname, 'assets/scripts');
console.log(__dirname);
console.log(dir_js);

var PATHS = {images:'/assets/img'};
var analytics = (production) ? "" : "ga";
var plugins = [
    new HtmlWebpackPlugin({
      template: 'dashboard.html',
      filename:'dashboard.html',
      title: 'Explore Synthetic Mass',
      chunks : analytics
    }),
    new HtmlWebpackPlugin({
      template: './dashboard/index.html',
      filename:'./dashboard/index.html',
      title: 'Explore Synthetic Mass'
    }),
    new HtmlWebpackPlugin({
      template:'./about.html',
      filename:'about.html',
      title: 'About Synthetic Mass',
      excludeChunks : ['bundle',analytics]
    }),
    new HtmlWebpackPlugin({
      template:'./feedback.html',
      filename:'feedback.html',
      title: 'Feedback for Synthetic Mass',
      excludeChunks : ['bundle',analytics]
    }),
    new HtmlWebpackPlugin({
      template:'./api.html',
      filename:'api.html',
      title: 'Synthetic Mass FHIR API',
      excludeChunks : ['bundle',analytics]
    }),
    new HtmlWebpackPlugin({
      template:'./download.html',
      filename:'download.html',
      title: 'Synthetic Mass Download',
      excludeChunks : ['bundle',analytics]
    }),
    new HtmlWebpackPlugin({
      template:'./index.html',
      filename:'index.html',
      title: 'Synthetic Mass',
      excludeChunks : ['bundle',analytics]
    }),
    extractCSS,
    new CopyWebpackPlugin([
      {from:'favicon-16x16.png'},
      {from:'favicon-32x32.png'},
      {from:'favicon.ico'},
      {from:'assets/img/profile_placeholder.png',to:'assets/img/profile_placeholder.png'}
    ])
  ];
/*     new CopyWebpackPlugin([
      {from:'about.html'}
    ]),
*/
if (node_env === "production") {
  plugins = plugins.concat([
      new CleanPlugin('build'),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({mangle: false, sourcemap:false}),
      new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.DefinePlugin({
      'API_HOST' : JSON.stringify('https://syntheticmass.mitre.org'),
      'FHIR_HOST' : JSON.stringify('https://syntheticmass.mitre.org/fhir/')
    })
  ]);
} else if (node_env === "staging") {
    plugins = plugins.concat([
      new CleanPlugin('build'),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({mangle: false, sourcemap:false}),
      new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.DefinePlugin({
      'API_HOST' : JSON.stringify('https://syntheticmass-stg.mitre.org'),
      'FHIR_HOST' : JSON.stringify('https://syntheticmass-stg.mitre.org/fhir/')
    })
  ]);
} else if (node_env === "development") {
    plugins = plugins.concat([
      new CleanPlugin('build'),
      new webpack.optimize.DedupePlugin(),
      new webpack.optimize.OccurenceOrderPlugin(),
      new webpack.optimize.UglifyJsPlugin({mangle: false, sourcemap:false}),
      new webpack.DefinePlugin({
      'process.env': {
        'NODE_ENV': JSON.stringify(process.env.NODE_ENV)
      }
    }),
    new webpack.DefinePlugin({
      'API_HOST' : JSON.stringify('https://syntheticmass-dev.mitre.org'),
      'FHIR_HOST' : JSON.stringify('https://syntheticmass-dev.mitre.org/fhir/')
    })
  ]);
} else {
    plugins = plugins.concat([
    new webpack.DefinePlugin({
      'API_HOST' : JSON.stringify('https://syntheticmass-dev.mitre.org'),
      'FHIR_HOST' : JSON.stringify('https://syntheticmass-dev.mitre.org/fhir/')
    })
    ]);
}
console.log(    path.resolve(dir_js,'app.js') );


module.exports = {
  debug : !production,
  context: __dirname,
  entry: {
    'fa' : 'font-awesome-loader',
    'bs' : 'bootstrap-loader',
    'ga' : path.resolve(dir_js,'ga.js'),
    'bundle' : path.resolve(dir_js,'app.js')
  },
  output: {
    path: __dirname + '/build',
    publicPath: '',
    filename: '[name].min.js'
  },
  devServer: {
        outputPath: path.join(__dirname, 'build')
  },
  devtool: '#cheap-module-eval-source-map',

  externals : {
    jquery : "jQuery",
    d3 : "d3",
    leaflet : "leaflet",
    turf : "turf"
  },

  module: {
    loaders: [{
      test: /\.hbs$/,
      loader: 'handlebars-loader',
      query: {
        partialDirs: [
          path.join(dir_js,'templates', 'partials')
        ]
      }
    },
    {
      test: /\.js$/,
      loader: 'babel-loader',
      exclude : /node_modules/
    },
      { test: /\.css$/i, loader: extractCSS.extract(["style", "css"]) },
      { test: /\.scss$/i, loader: extractCSS.extract(["style", "css", "postcss","sass"]) },

      {
        test: /\.woff2?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: "url?limit=10000"
      },
      {
        test: /\.(ttf|eot|svg)(\?[\s\S]+)?$/,
        loader: 'file'
      },
       { test: /\.jpg$/, loader: "url-loader?mimetype=image/jpeg" },
       { test: /\.png$/, loader: "url-loader?mimetype=image/png" },
      // Bootstrap 3
      { test: /bootstrap-sass\/assets\/javascripts\//, loader: 'imports?jQuery=jquery' },
]
  },
  node: {
   fs: "empty"
  },
  plugins: plugins
};
