import patients_list_tmpl from './templates/patients_list.hbs';
import patient_detail_tmpl from './templates/patient_detail.hbs';

import moment from 'moment';

const baseUrl = `${FHIR_HOST}`;

export function loadPatients({city = '',count = 20}) {
  const param = $.param( { ['address-city'] : city, _count : count} );
  const promise = $.ajax({
    url :baseUrl + 'Patient',
    type : 'get',
    dataType:'json',
    data : param});
  return promise;
}

export function loadPatient(pid = '') {
  const promise = $.ajax({
    url :baseUrl + 'Patient/' + pid,
    type : 'get',
    dataType:'json'
  });
  return promise;
}

export function loadPaginationURL(url = '') {
  const promise = $.ajax({
    url: url,
    type: 'get',
    dataType:'json'
  });
  return promise;
}

export function generatePatientsHTML(rawResponse, city = "") {
  let nextUrl = "",
      prevUrl = "",
      currNodes;
  if (rawResponse.resourceType === "Bundle") {
    if (rawResponse.entry != undefined) {
      if (city !== "") {
        currNodes = rawResponse.entry.filter(function(rawNode) {
          return rawNode.resource.resourceType == "Patient" && rawNode.resource.address[0].city == city;
          });
      }
      else {
        currNodes = rawResponse.entry.filter(function(rawNode) {
          return rawNode.resource.resourceType == "Patient";
          });
      }
    }
    if (rawResponse.hasOwnProperty("link")) {
      for (const link of rawResponse.link) {
        if (link.relation == "next") {
          nextUrl = link.url;
        }
        else if (link.relation == "previous") {
          prevUrl = link.url;
        }
      }
    }
    return renderPatientsTable(currNodes, nextUrl, prevUrl);
  }
  else {
    console.log("Something went wrong with the search response.");
  }
}

export function generatePatientDetail(json) {
  const {familyName,givenName} = _getPatientName(json);
  return patient_detail_tmpl({familyName,givenName});

}


function compareByBirthDate(a, b) {
  return new Date(a.resource.birthDate) - new Date(b.resource.birthDate);
}

function renderPatientsTable(pNodes, nextUrl, prevUrl) {
  pNodes.sort(compareByBirthDate);
  let patients = [];
  for (let i = 0; i < pNodes.length; i++) {
      let currResource = pNodes[i].resource,
          pid = currResource.id;

      patients.push({
        pid : pid,
        name : _getPatientNameStr(currResource),
        gender : currResource.gender,
        dob : _getPatientDOB(resource)
       });
  }
  return patients_list_tmpl({patients, prevUrl, nextUrl});
}


/* Lookup functions to extract patient resource details */
function _getPatientDOB(resource) {
  return moment(resource.birthDate).format('DD.MMM.YYYY');
}

function _getPatientName(resource) {
  for (let j = 0; j < resource.name.length; j++) {
    if (j == 0 || (resource.name[j].hasProperty("use") &&
                   resource.name[j].use == "official")) {
      name = resource.name[j];
    }
  }
  return name;
}
function _getPatientNameStr(resource) {
  return ((name) => {return `${name.family}, ${name.given}`;})(_getPatientName(resource));
}