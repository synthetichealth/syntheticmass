Synthetic Mass Server Setup
===========================

Software Installed
------------------
The following software packages and versions are installed and required to run Synthetic Mass:

1. MongoDB (3.2.9)
2. PostgreSQL (9.5.4)
3. Python (2.7.11+)
4. Go (1.7)
4. [GoFHIR](https://github.com/synthetichealth/gofhir.git)
5. [HTC API](https://github.com/synthetichealth/syntheticmass.git)

Deploying Updates
-----------------
Any updates to the server should be tested **FIRST** on syntheticmass-stg.mitre.org. If successful, those updates should then be repeated on syntheticmass.mitre.org (the production environment).

Successful changes to syntheticmass-stg.mitre.org should be documented in [RELEASE.md](./RELEASE.md). See RELEASE.md for more details.

Ubuntu Version
--------------
Currently we are running Ubuntu 16.04 LTS. You can check the OS version by running:

```
$ lsb_release -a
```

Working Behind the MITRE Proxy
------------------------------
I recommend you add the following to your `.bashrc` to quickly enable or disable the MITRE proxy settings:

```
# Function to setup MITRE proxy
function setproxy() {
	server='gatekeeper.mitre.org:80';
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

**NOTE:** When updating syntheticmass.mitre.org (the production site) the proxy should be **unset**.

Verify MongoDB version
----------------------

```
$ mongod --version
```
	
If not installed, follow [these steps](https://www.digitalocean.com/community/tutorials/how-to-install-mongodb-on-ubuntu-16-04) to install the latest MongoDB version. Note the following:
	
To get the GPG key for the official MongoDB repository from behind the MITRE proxy you'll need to setup the `http_proxy` environment variable and add the `-E` flag when calling `sudo` to pickup this environment variable:
	
```
sudo -E apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv EA312927
```
	
From there the install instructions should be the same as the document linked above.	

Verify PostgreSQL version
-------------------------

```
$ psql --version
```
	
If not installed, run the following to install PostgreSQL:
	
```
$ sudo apt-get update
$ sudo apt-get install postgresql postgresql-contrib
```

Verify PostGIS Postgres Extension
---------------------------------

Synthetic Mass uses additional geolocation data stored in Postgres made possible by the [PostGIS Postgres extension](http://postgis.net/). To check if PostGIS is installed run the following:
	
```
$ dpkg --get-selections | grep postgis
```
	
If PostGIS is not installed. Install PostGIS by running:
	
```
$ sudo apt-get install -y postgis postgresql-9.5-postgis-2.2
```

Verify System Python Version

```
$ python --version
```
	
Since the HTC API is not sensitive to the minor Python versions, any Python 2.7.11+ is fine. This includes the latest Python 2.7.12.

Verify Go Version
-----------------

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
	
Setup `synth_ma` Schema in Postgres
-----------------------------------

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
	 

Setup GoFHIR
------------

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
	
Next, checkout and build the `disable-interceptors` branch of GoFHIR:

```
$ cd $GOPATH/src/github.com/synthetichealth/gofhir
$ git checkout -b disable-interceptors
$ git branch -u origin/disable-interceptors disable-interceptors  # set-up remote tracking
$ git pull
$ go build
```

**NOTE:** While there are tests for the `gofhir/stats` package (containing the Data Access Layer interceptors) these interceptors are for an outdated version of the `synth_ma` schema and are therefore unusable at the moment. The `disable-interceptors` branch of this repository appropriately disables these interceptors.


Next, create a new directory to run GoFHIR out of:

```
$ sudo mkdir -p /opt/gofhir
```

Then copy everything needed to run GoFHIR into this directory:

```
$ cd $GPATH/src/github.com/synthetichealth/gofhir
$ sudo cp gofhir /opt/gofhir
$ sudo cp -r config /opt/gofhir
$ sudo cp -r conformance /opt/gofhir
```

Create a log file to capture GoFHIR's output:

```
$ cd /opt/gofhir
$ sudo touch gofhir.log && chmod ugo+x gofhir.log
```

Finally, create a `fhir_run.sh` script in `/opt/gofhir/` that will be called by a system service:

```
$ cd /opt/gofhir
$ sudo touch fhir_run.sh && chmod ugo+x fhir_run.sh
```

`fhir_run.sh` should contain:

```
#!/bin/bash
cd /opt/gofhir
nohup ./gofhir -pgurl postgres://fhir:fhir@localhost/fhir?sslmode=disable > ./gofhir.log &
```

Setup the HTC API
-------------------------
In `/opt/` clone the `syntheticmass` repository:

```
$ cd /opt/
$ sudo - E git clone https://github.com/synthetichealth/syntheticmass.git
```

Setup System Services
---------------------
We use system services to automatically start the APIs when the server boots. Create the following files in `/lib/systemd/system`:

```
$ cd /lib/systemd/system
$ sudo touch gofhir-auto.service
$ sudo touch htc-api-auto.service
```

**`gofhir-auto.service`** should contain:

```
[Unit]
Description=Job that starts the gofhir server
After=postgresql.service mongod.service

[Service]
Type=forking
ExecStart=/bin/bash /opt/gofhir/fhir_run.sh

[Install]
WantedBy=multi-user.target
```

**`htc-api-auto.service`** should contain:

```
[Unit]
Description=Job that starts the syntheticmass htc api
After=postgresql.service

[Service]
Type=forking
WorkingDirectory=/opt/syntheticmass/htc-api/api
ExecStart=/bin/bash /opt/syntheticmass/htc-api/api/htc_run.sh

[Install]
WantedBy=multi-user.target
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


Configure Apache Mod_Proxy
--------------------------
To access the GoFHIR and HTC APIs over the open web Apache's proxy settings need to be configured:

```
$ cd /etc/apache2/sites-available/
```

In **`ssl-syntheticmass.mitre.org.conf`** set:

```
ServerName <host>.mitre.org
ServerAlias www.<host>.mitre.org

...

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

Check that the APIs are now accessible using a web browser:

```
$ curl https://<host>.mitre.org/api/v1          # the API root
$ curl https://<host>.mitre.org/fhir/metadata   # the conformance statement
```