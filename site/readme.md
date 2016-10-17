## Building The Site

The SyntheticMass website is built from the HTML, CSS and JS files in the `/site` directory. This is done using the [Webpack](http://webpack.github.io/) module builder tool.

### Development mode
```bash
$ cd site
$ npm start
```
This will start the webpack-dev-server in watch mode. As you edit the files in `site` it will automatically create a new bundle in the `site/build` directory. Webpack will transpile the ES6, Javascript, SCSS stylesheets and HTML. Webpack treats _all_ assets as 'modules' that can be manipulated in the JS environment, including images, fonts and stylesheets. This is quite different from other build systems, such as grunt or gulp. 

In addition, most of the major libraries used by the site are referenced from CDNs directly, and are not included in the repository or installed locally. This means that you *must* have outernet access to run the application, even in development mode. 

### Install Dependencies

From the `site/` directory:

```
$ npm install
```

### Debugging mode

```
$ npm run build-dev
```

### Staging Mode
To prepare the site for deployment to the staging server, you need to build the site in staging mode.

```bash
$ npm run build-stg
```

This will clean out the `build` directory of all files and run webpack in `staging` mode with the `production` flag **disabled**. This will turn on additional optimizations in webpack to minify the bundled code.
It will also switch between the development API Server and staging API server. See the file `site/webpack.config.js`

### Production mode
To prepare the site for deployment to the production server, you need to build the site in production mode.

```bash
$ npm run build
```

This will make the same optimizations as `build-stg` but will run webpack with the `production` flag **enabled**.

### Deploying the site

All files necessary for the production site are located in the `build` directory. Copy those files to the `DocumentRoot` of the server.
