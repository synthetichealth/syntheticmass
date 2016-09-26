#!/bin/bash
cd /opt/gofhir
nohup ./gofhir -pgurl postgres://fhir:fhir@localhost/fhir?sslmode=disable > ./gofhir.log &
