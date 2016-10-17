# Deploying to Production

## Environments

Current we have 3 environments that we deploy to:

1. **syntheticmass-dev.mitre.org**  
	Our development server. This server operates behind the MITRE proxy and exposes all services, such as the FHIR server (port 3001), MongoDB (port 27017), and HTC API (port 8000). **The software and data on this system may be unstable**.
	

2. **syntheticmass-stg.mitre.org**  
	Our staging server. This server is still behind the MITRE proxy  but does not expose services like the development server. This server _should_ match the production server.

3. **syntheticmass.mitre.org**  
	Our production server. **Production is sacred.** Only migrate changes to this server after they have been deployed and tested on staging.
	
## Deployment Steps

1. Begin by deploying to **syntheticmass-dev.mitre.org**. This may include:

	* Updating the [Postgres schema](https://github.com/synthetichealth/pgstats)
	* Adding patient data to the FHIR database using the [bulk uploader](https://github.com/synthetichealth/bulkfhirloader)
	* Updating the SyntheticMass website (see [Building the Site](../site/readme.md))
	* Updating the Apache configuration (see [Apache Configuration](../setup/apache/README.md))
	* Updating the [GoFHIR server](https://github.com/synthetichealth/gofhir)

2. Once you've made your updates and verified that everything works s expected, perform the same steps on **syntheticmass-stg.mitre.org**. Optionally you may also chose to [migrate the Mongo database](#migrating-the-mongo-database) and  [migrate the Postgres database](#migrating-the-postgres-database).

3. Following a successful deployment on syntheticmass-stg, _carefully_ repeat the steps on the production site.

4. Any additional changes or deployment steps should be added to the [Server Setup](../setup/README.md) document or this document.


## Migrating the Mongo Database

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

## Migrating the Postgres Database

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