Synthetic Mass Release Notes
============================
Instructions
------------
Any updates to the server should be tested **FIRST** on **syntheticmass-stg.mitre.org**. If successful, those updates should then be repeated on syntheticmass.mitre.org (the production environment).

All software on Synthetic Mass should be documented one of two ways:

1. Third-party software should list the software name and specific version number, for example:

	```
	MongoDB 3.2.9
	```
	
2. Our software should list the repository name, branch name, and commit number, for example:

	```
	github.com/synthetichealth/gofhir master c9ab12d
	```
	
Each release listed below should have the date and title of the release, followed by any comments or notes relevant to the release. The most recent release should be listed at the top.
	
Releases
--------

**[2016-09-29] Initial Stable Deployment**

Our initial deployment to **syntheticmass-stg.mitre.org** and **syntheticmass.mitre.org** with the latest stable software versions.

```
MongoDB 3.2.9  
PostgreSQL 9.5.4
PostGIS 2.2.1 
Python 2.7.11+  
Go 1.7
Node 5.11.0
Apache 2.4.18
Apache mod_proxy

github.com/synthetichealth/gofhir fhir-updates 1654183
github.com/synthetichealth/syntheticmass master 38341a1
```
