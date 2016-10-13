# SyntheticMass



## About SyntheticMass

SyntheticMass ([syntheticmass.mitre.org](https://syntheticmass.mitre.org/)) is model of all 7 million residents of the state of Massachusetts, with artificial health records for the fictional residents. This establishes a risk-free environment for:

* Data visualization
* Risk stratification
* Care management
* Clinical decision support
* Patient Reported data integration
* Evaluation of new treatment models
* Privacy and consent models
* Security and authorization models
* Third-party app development

SyntheticMass will provide a sandbox for Health IT developers, researchers and clinicians interested in prototyping new healthcare solutions. It enables this through:

* Realistic data for fictional patients
* Data that is free of protected health information (PHI) and personally identifiable information (PII) constraints
* Datasets updated over time based on clinical healthcare models and epidemiological models of population health.

## About the Team Behind SyntheticMass
###The MITRE Corporation
[The MITRE Corporation](http://www.mitre.org/) is a not-for-profit organization working in the public interest that operates federally funded research and development centers to provide innovative solutions to national problems.


## Supporting Documentation

* [Release Notes](./RELEASE.md)
* [Server Setup](./setup/README.md)
* [Deploying to Production](./docs/deploying.md)
* [Building the Site](./site/readme.md)
* [Using the FHIR API](./docs/using-fhir.md)
* [Synthetic Statistics Using Postgres](https://github.com/synthetichealth/pgstats)

## Third-Party Software

The [GoFHIR server](https://github.com/synthetichealth/gofhir) used by SyntheticMass is based on a generic [Go-based FHIR server](https://github.com/intervention-engine/fhir) originally developed at MITRE for the [Intervention Engine Project](https://github.com/intervention-engine/ie).

Additional third-party software packages we use are listed in the [Release Notes](./RELEASE.md) document.