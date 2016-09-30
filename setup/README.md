Synthetic Mass Server Setup
===========================

Contents
--------
* [Setup MongoDB](#setup-mongodb)
* [Setup PostgreSQL](#setup-postgresql)
* [Setup Postgis](#setup-postgis)
* [Setup Python](#setup-python)
* [Setup Go](#setup-go)
* [Setup Node](#setup-node)
* [Setup Database Schema](#setup-database-schema)
* [Setup GoFHIR Server](#setup-the-gofhir-server)
* [Setup HTC API](#setup-the-htc-api)
* [Setup Synthetic Mass UI](#setup-the-synthetic-mass-ui)
* [Setup System Services](#setup-system-services)
* [Configure Apache Proxy](#configure-apache-proxy)
* [Migrate the Mongo Database](#migrating-the-mongo-database)
* [Migrate the Postgres Database](#migrating-the-postgres-database)

Software Installed
------------------
See [RELEASE.md](../RELEASE.md) for the latest list and versions of installed software packages.


Deploying Updates
-----------------
Any updates to the server should be tested **FIRST** on syntheticmass-stg.mitre.org. If successful, those updates should then be repeated on syntheticmass.mitre.org (the production environment).

Successful changes to syntheticmass-stg.mitre.org should be documented in [RELEASE.md](../RELEASE.md). See RELEASE.md for more details.

Ubuntu Version
--------------
Currently we are running Ubuntu 16.04 LTS. You can check the OS version by running:

```
$ lsb_release -a
```

Working Behind the MITRE Proxy
------------------------------
**NOTE: This only applies to the dev and staging environments.**

I recommend you add the following to your `.bashrc` to quickly enable or disable the MITRE proxy settings:

```
# Function to setup MITRE proxy
function setproxy() {
	server='<MITRE_proxy_server>:80';
	export HTTP_PROXY=$server;
	export http_proxy=$server;
	export HTTPS_PROXY=$server;
	export https_proxy=$server;
	echo "Proxy set to $server"
}

# Function to unset the MITRE proxy
function unsetproxy() {
	unset HTTP_PROXY http_proxy HTTPS_PROXY https_proxy;
	echo "Proxy unset"
}

# Set the proxy by default on login
setproxy
```

For most of this setup you will need to `http_proxy` and `https_proxy` set.


Setup MongoDB
-------------
Verify the installed MongoDB version:

```
$ mongod --version
```
	
If not installed, follow [these steps](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-16-04) to install the latest MongoDB version. Note the following:
	
To get the GPG key for the official MongoDB repository from behind the MITRE proxy you'll need to setup the `http_proxy` environment variable and add the `-E` flag when calling `sudo` to pickup this environment variable:
	
```
sudo -E apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
```
	
From there the install instructions should be the same as the document linked above.	

Setup PostgreSQL
-----------------
Verify the installed PostgreSQL version:

```
$ psql --version
```
	
If not installed, run the following to install PostgreSQL:
	
```
$ sudo apt-get update
$ sudo apt-get install postgresql postgresql-contrib
```

Setup PostGIS
-------------

Synthetic Mass uses additional geolocation data stored in Postgres made possible by the [PostGIS Postgres extension](http://postgis.net/). To check if PostGIS is installed run the following:
	
```
$ dpkg --get-selections | grep postgis
```
	
If PostGIS is not installed. Install PostGIS by running:
	
```
$ sudo apt-get install -y postgis postgresql-9.5-postgis-2.2
```

Setup Python
------------
Verify the system python version:

```
$ python --version
```
	
Since the HTC API is not sensitive to the minor Python versions, any Python 2.7.11+ is fine. This includes the latest Python 2.7.12. In most cases an adequate version of Python will come with Ubuntu by default.

Setup Go
--------
Verify the installed Go version:

```
$ go version
```

As of this writing there is no official ubuntu distribution for Go 1.7 (only Go 1.6), so Go 1.7 must be installed manually:
	
```
$ cd ~ && mkdir install && cd install
$ wget --no-check-certificate https://storage.googleapis.com/golang/go1.7.linux-amd64.tar.gz
$ sudo tar -xvf go1.7.linux-amd64.tar.gz
$ sudo mv go /usr/local 
```

This installs go 1.7 in `/usr/local/go/`. You'll need to setup your Go environment variables as well:
	
```
$ export GOROOT=/usr/local/go
```
	
Create a `go/` directory in your home directory where your local golang project will go, then setup your `GOPATH`:
	
```
$ mkdir ~/go/
$ export GOPATH=$HOME/go
```
	
Finally, add go to your `PATH`:
	
```
$ export PATH=$GOPATH/bin:$GOROOT/bin:$PATH
```
	
Since you will need these environment variables setup whenever you work with Go, I recommend adding the following to your `.bashrc` file:
	
```
# Setup Go environment variables
export GOROOT=/usr/local/go
export GOPATH=$HOME/go
export PATH=$GOPATH/bin:$GOROOT/bin:$PATH
```
Finally, test that Go 1.7 is installed:
	
```
$ go version
```

Setup Node
----------
Verify the current node version:

```
$ node -v
```

If not installed or out of date, install or update Node using [NVM](https://github.com/creationix/nvm), the Node Version Manager. If you don't have NVM installed, run the following from your `install/` directory:

```
$ cd $HOME/install/
$ wget --no-check-certificate https://raw.githubusercontent.com/creationix/nvm/v0.32.0/install.sh -O install_nvm.sh
$ sudo chmod +x install_nvm.sh
$ ./install_nvm.sh
```

This will install NVM in `~/.nvm`. You can confirm your installation was successful by running:

```
$ command -v nvm  # should print 'nvm' to the console
```

Once installed, you can then use NVM to get any node version:

```
$ nvm install 5.11.0
```
	
Setup Database Schema
---------------------

**NOTE: This only needs to be performed for a NEW database setup. If you are migrating an existing database you can skip this step.**

All patient/condition statistics used by Synthetic Mass are stored in a series of Postgres tables in the `synth_ma` schema. There are a series of `.sql` files and scripts in the `pgstats` repository that should be used to setup the database.
	
First, clone the `pgstats` repository:
	
```
$ mkdir $HOME/synthetichealth && cd $HOME/synthetichealth
$ git clone https://github.com/synthetichealth/pgstats.git
```
	
Then, as user `postgres` run the setup script **from the directory you cloned `pgstats`**:
	
```
$ sudo su - postgres
$ cd /home/<your_username>/synthetichealth/pgstats/scripts
$ ./deploy_stats_schema.sh
```
	
This will drop the old stats tables and views if they exist, then create new tables and views populated with the latest stats data. See the `pgstats` [README](https://github.com/synthetichealth/pgstats) for more information.
	 

Setup the GoFHIR Server
-----------------------

Create a new directory on your `GOPATH` and clone the GoFHIR repo:
	
```
$ mkdir -p $GOPATH/src/github.com/synthetichealth
$ git clone https://github.com/synthetichealth/gofhir.git
```
	
This clones the GoFHIR server in the `gofhir/` directory.
	
Then get GoFHIR's dependencies:
	
```
$ cd gofhir
$ go get -t ./...
```
	
You may get the following error with the `mgo.v2` package:
	
```
# github.com/synthetichealth/gofhir/vendor/gopkg.in/mgo.v2/internal/sasl
vendor/gopkg.in/mgo.v2/internal/sasl/sasl.go:15:24: fatal error: sasl/sasl.h: No such file or directory
// #include <sasl/sasl.h>
                    ^
compilation terminated.
```
	
This can be fixed by installing `libsasl2-dev`:
	
```
$ sudo apt-get install libsasl2-dev
```
	
Next, checkout and build the `fhir-updates` branch of GoFHIR:

```
$ cd $GOPATH/src/github.com/synthetichealth/gofhir
$ git checkout -b fhir-updates
$ git branch -u origin/fhir-updates fhir-updates  # set-up remote tracking
$ git pull
$ go build
```

**NOTE:** While there are tests for the `gofhir/stats` package (containing the Data Access Layer interceptors) these interceptors are for an outdated version of the `synth_ma` schema and are therefore unusable at the moment. The `fhir-updates` branch of this repository appropriately disables these interceptors.


Next, create a new directory to run GoFHIR out of:

```
$ sudo mkdir -p /opt/gofhir
```

Then copy everything needed to run GoFHIR into this directory:

```
$ cd $GPATH/src/github.com/synthetichealth/gofhir
$ sudo cp gofhir /opt/gofhir
$ sudo cp fhir_run.sh /opt/gofhir
$ sudo cp -r config /opt/gofhir
$ sudo cp -r conformance /opt/gofhir
```

You will need to modify `htc_run.sh` depending on what environment (dev, staging, production) you are running in. Set the `-server` flag to indicate the full URL path to the server root. For example, on staging this may look like:

```
$ ./gofhir -server https://syntheticmass-stg.mitre.org/fhir -pgurl ...
```

Setup the HTC API
-----------------
Clone the `syntheticmass` repository:

```
$ cd $HOME/synthetichealth/
$ sudo -E git clone https://github.com/synthetichealth/syntheticmass.git
```

This repository contains both the HTC API and the Synthetic Mass UI.

Copy the API into `/opt/syntheticmass/`:

```
$ cd syntheticmass
$ sudo mkdir -p /opt/syntheticmass/
$ sudo cp -r htc-api/ /opt/syntheticmass/
```

Make sure the `htc_run.sh` script is executable:

```
$ cd /opt/syntheticmass/htc-api/api/ && ls -l
$ sudo chmod +x htc_run.sh  # if it's not already executable
```

Setup the Synthetic Mass UI
---------------------------

From the `syntheticmass` repository build the latest version of the UI. You may need to fetch the required Node packages using npm.

```
$ cd $HOME/synthetichealth/syntheticmass/site/
$ npm install
```

If you encounter issues with the MITRE proxy, set NPM's proxy configuration:

```
npm config set proxy http://<MITRE_proxy_server>:80
npm config set https-proxy http://<MITRE_proxy_server>:80
```

Which build to use depends on the current environment (dev, staging or production). For dev, use:

```
$ npm run build-dev
```

For staging, use:

```
$ npm run build-stg
```

For production, use:

```
$ npm run build
```

This cleans the `build/` directory and rebuilds the site. When the build is finished the full site will be in `build/`. To deploy the site copy this build directory to `var/www/syntheticmass.mitre.org/public_html/`:

```
$ sudo rm -r /var/www/syntheticmass.mitre.org/public_html/
$ sudo cp -r build/ /var/www/syntheticmass.mitre.org/public_html/
```


Setup System Services
---------------------
We use system services to automatically start the APIs when the server boots. Copy the following files from `syntheticmass/setup/services/` to `/lib/systemd/system/`:

```
$ cd $HOME/synthetichealth/syntheticmass/setup/services/
$ sudo cp gofhir-auto.service /lib/systemd/system/
$ sudo cp htc-api-auto.service /lib/systemd/system/
```

Then enable and start these services:

```
$ sudo systemctl enable gofhir-auto.service
$ sudo systemctl start gofhir-auto.service

$ sudo systemctl enable htc-api-auto.service
$ sudo systemctl start htc-api-auto.service
```

This will start both APIs. Confirm that they're running:

```
$ ps -aux | grep gofhir
$ ps -aux | grep htc_api.py
```


Configure Apache Proxy
----------------------
To access the GoFHIR and HTC APIs over the open web Apache's proxy settings need to be configured:

```
$ cd /etc/apache2/sites-available/
```

In **`ssl-syntheticmass.mitre.org.conf`** set:

```
ServerName <host>.mitre.org
ServerAlias www.<host>.mitre.org

...

ProxyPreserveHost On

ProxyPass "/api" "http://localhost:8080/htc/api"
ProxyPassReverse "/api" "http://localhost:8080/htc/api"

ProxyPass "/fhir" "http://localhost:3001"
ProxyPassReverse "/fhir" "http://localhost:3001"
```

In **`syntheticmass.mitre.org.conf`** set:

```
ServerName <host>.mitre.org
ServerAlias www.<host>.mitre.org
RedirectMatch permanent / https://<host>.mitre.org/
```

Where, depending on your environment, `<host>` is one of:

1. `syntheticmass-dev`
2. `syntheticmass-stg`
3. `syntheticmass`

Once you've updated the configuration, **restart Apache** for the new settings to take effect:

```
$ sudo systemctl restart apache2.service
```

Check that the APIs are now accessible using a web browser:

```
$ curl https://<host>.mitre.org/api/v1          # the API root
$ curl https://<host>.mitre.org/fhir/metadata   # the conformance statement
```

Migrating the Mongo Database
----------------------------

From your local home directory:

```
$ mongodump --out=./dump --gzip
```

This dumps the **ENTIRE** mongo database, including multiple databases if they exist, into the `dump/` folder. The `--gzip` flag significantly compresses the dump, making it easier to transfer.

Next copy the dump to your home directory in another environment:

```
$ scp -r ./dump/ <user>@<host>.mitre.org:/home/<user>/
``` 

Finally, from the directory that the dump was copied to:

```
$ mongorestore --gzip ./dump
```

The restore **does not** rebuild the indexes automatically. GoFHIR must be restarted to build the indexes anew.

Migrating the Postgres Database
-------------------------------

As user `postgres`:

```
$ sudo su - postgres
$ pg_dump -F c fhir > fhir.bak
```

This dumps the database in the `pg_dump` custom format into user `postgres`'s home directory (`/var/lib/postgresql/`).

Next, copy the dump to your home directory in another environment:

```
$ scp fhir.bak <user>@<host>.mitre.org:/home/<user>/
```

Finally, again as user `postgres`, perform the restore:

```
$ sudo su - postgres
$ cd /home/<user>/
$ pg_restore -d fhir -F c fhir.bak
```