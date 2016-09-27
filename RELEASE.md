Synthetic Mass Release Notes
============================
Instructions
------------
Any updates to the server should be tested **FIRST** on **syntheticmass-stg.mitre.org**. If successful, those updates should then be repeated on syntheticmass.mitre.org (the production environment).

All software on Synthetic Mass should be documented one of two ways:

1. Third-party software should list the software name and specific version number, for example:

	```
	MongoDB 3.2.8
	```
	
2. Our software should list the repository name, branch name, and commit number, for example:

	```
	github.com/synthetichealth/gofhir master 21cc20f492bdbfca0c487007c430dddf5829df53
	```
	
Each release listed below should have the date and title of the release, followed by any comments or notes relevant to the release. The most recent release should be listed at the top.
	
Releases
--------

**[2016-09-26] Initial Deployment**

Our initial deployment to **syntheticmass-stg.mitre.org** and **syntheticmass.mitre.org** with the latest stable software versions.

```
MongoDB 3.2.9  
PostgreSQL 9.5.4  
Python 2.7.11+  
Go 1.7
github.com/synthetichealth/gofhir disable-interceptors 21cc20f
github.com/synthetichealth/syntheticmass master 2b0c019
```
