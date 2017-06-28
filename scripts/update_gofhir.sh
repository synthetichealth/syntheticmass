#!/bin/bash

gofhirpath=$GOPATH/src/github.com/synthetichealth/gofhir
optdir=/opt/gofhir
branch=stu3_jan2017

here=`pwd`

echo "Fetching latest..."
cd $gofhirpath
git checkout $branch
git pull
echo "Building..."
go build
echo "Stopping gofhir-auto.service..."
sudo systemctl stop gofhir-auto.service
echo "Moving files..."
sudo cp gofhir $optdir
echo "Restarting gofhir-auto.service..."
sudo systemctl start gofhir-auto.service
cd $here
echo "Done"
