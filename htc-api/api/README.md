htc-api/api
================================

This is the REST API for the Massachusetts High Tech Counsel Project.  It uses the [Flask](http://flask.pocoo.org/) microframework for Python.

## Installation
These installation instructions were written from a Mac OSX 10.11.5 machine, running Python v2.7.11.

### Configure MITRE Proxy
Since this API will be running locally during development, we'll need to make sure the proxy is set.  This doesn't cover the correct installation of the MITRE BA Certificates.  Might be a good idea to add this to *.bash_profile* or your equivalent shell profile.

```bash
# Set no_proxy environment variable
$ export no_proxy='localhost,127.0.0.1,.mitre.org'
$ export NO_PROXY=$no_proxy
# Proxy on/off
$ alias proxy-on="export http_proxy='http://gatekeeper.mitre.org:80'; export https_proxy='http://gatekeeper.mitre.org:80'; export HTTP_PROXY=$http_proxy; export HTTPS_PROXY=$https_proxy;"
$ alias proxy-off="unset http_proxy ; unset https_proxy ; unset HTTP_PROXY ; unset HTTPS_PROXY"
```

### Check Python
The following commands will check where Python is installed and which version is being used.  We will also check if the Python **virtualenv** package is installed.

```bash
$ which python
$ python --version
$ pip freeze

If `which python` or `python --version` doesn't return the expected results, you'll need to install Python.  If `pip freeze` doesn't return a list of packages, one of which should be **virtualenv**, then you need to install the package with:  
```bash
$ pip install virtualenv
```

### Clone repo from GitLab
Pull down the remote htc-api repository to your local machine.

```bash
$ git clone git@gitlab.mitre.org:HTCProject/htc-api.git
```

### Create Virtualenv
Create the python virtualenv package, activate it, and install the required Python packages.

```bash
$ cd htc-api/api
$ virtualenv venv
$ source venv/bin/activate
$ pip install -r requirements.txt
```

### Run REST API
Start the rest API [localhost:8080/htc/api/v1](localhost:8080/htc/api/v1) in the background and send logs to htc_api.log.  

```bash
$ . htc_run.sh
```

When the REST API starts, you will get a popup message that says:  
**Do you want the application “python2.7” to accept incoming network connections?**  

Click **Allow**.  If you are running in DEBUG mode, you should get two popups.

### Using the REST API
Once the REST API is running, you can visit [localhost:8080/htc/api/v1](localhost:8080/htc/api/v1) to read the API documentation.  Using the API is as simple as making a request, e.g. [http://localhost:8080/htc/api/v1/counties](http://localhost:8080/htc/api/v1/counties) or [http://localhost:8080/htc/api/v1/counties/list](http://localhost:8080/htc/api/v1/counties/list).  All requests should return valid JSON.  Any requests that contain geographic information will be returned as [GeoJSON](http://geojson.org/).

### Stop REST API
To stop the application from running, you need to find out the PID's in use  
```bash
$ . htc_kill.sh
FLASK_PIDS_TO_KILL = 40929
40947
[1]+  Killed: 9               nohup python htc_api.py > htc_api.log 2>&1
```