# Apache Configuration

**NOTE:** Whenever the Apache configuration files change Apache must be restarted. See below.

## Config Files

The configuration files for Apache are kept in `/etc/apache2/sites-available/`. This directory should contain:

### Default Configuration Files:

* `000-default.conf`
* `default-ssl.conf`

### SyntheticMass Configuration Files:
* `syntheticmass.mitre.org.conf`
* `ssl-syntheticmass.mitre.org.conf`

## HTTP

The server's HTTP configuration is in `syntheticmass.mitre.org.conf`. For our purposes this just permanently redirects all HTTP traffic to HTTPS.

## HTTPS

Ther server's HTTPS configuration is in `ssl-syntheticmass.mitre.org.conf`. This configures:

* The `DocumentRoot` for the server
* CORS support
* Logging
* SSL
* Proxying requests to various APIs and services
* Aliases for client-side routing (see below)

### Special Note for the SyntheticMass UI:

All traffic to `https://syntheticmass.mitre.org/dashboard/*` is aliased to load `dashboard/index.html`. A client-side router (using the [express.js](https://expressjs.com/) framework) then handles all URLs from this endpoint.

## Restarting Apache

Whenever the Apache configuration files are changed Apache must be restarted:

```
$ sudo systemctl restart apache2.service
```