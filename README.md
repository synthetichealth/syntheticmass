# SyntheticMass



## About SyntheticMass

SyntheticMass ([syntheticmass.mitre.org](https://syntheticmass.mitre.org/)) is model of synthetic residents of the state of Massachusetts, with artificial health records for the fictional residents. This establishes a risk-free environment for:

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

## License

Copyright 2016 The MITRE Corporation

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and limitations under the License.
