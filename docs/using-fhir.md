# Using the GoFHIR Server

## Server Endpoint

The FHIR server's root URL is:

```
https://syntheticmass.mitre.org/fhir
```
There is no content at the root of the server, but you can obtain the server's conformance statement at:

```
https://syntheticmass.mitre.org/fhir/metadata
```

## FHIR Version 1.6
Currently we support **FHIR STU3 v1.6.0**. See [FHIR STU3 Ballot (v1.6.0-9663)](http://hl7.org/fhir/2016Sep/index.html). Note that this version is still under development and liable to change.

## Accessing the Server

### Requesting Resources

To request a resource or list of resources (e.g. Patients, Observations, Encounters) from the server, append that resource's singular name to the root URL. For example, to request a list of patients:

```
GET https://syntheticmass.mitre.org/fhir/Patient
```

You can also request a specific resource by ID:

```
GET https://syntheticmass.mitre.org/fhir/Patient/:id/
```

See FHIR's [RESTful API Documentation](http://hl7.org/fhir/2016Sep/http.html) for more information on using a FHIR-spec API.

### Searching

Our FHIR server also supports searching resources by a variety of criteria. See FHIR's [Search Documentation](http://hl7.org/fhir/2016Sep/search.html) for more information on using the FHIR search API.

### Authentication

We plan to support OAuth in an upcoming release. Currently the API is publicly accessible on the open web and does not require authentication.

### Limitations


Currently the server is **read-only**. Any requests with an HTTP method other than `GET`, (e.g. `POST` or `PUT`) will receive a `403 Forbidden` response from the server.

We only support the JSON format for responses. Any requests with an `Accept` header requesting XML or other non-JSON formats will receive a `406 Not Acceptable` response.


