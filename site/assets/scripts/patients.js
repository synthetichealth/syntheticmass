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
  return patient_detail_tmpl({givenName : "Bob", familyName: "Smith"});
}


function compareByBirthDate(a, b) {
  return new Date(a.resource.birthDate) - new Date(b.resource.birthDate);
}

function renderPatientsTable(pNodes, nextUrl, prevUrl) {
  pNodes.sort(compareByBirthDate);
  let patients = [];
  for (let i = 0; i < pNodes.length; i++) {
      let currResource = pNodes[i].resource,
          name = '',
          nameStr = '',
          pid = currResource.id;

      // Loop to find the best name. Also, bring this back to the record spot.
      for (let j = 0; j < currResource.name.length; j++) {
        if (j == 0 || (currResource.name[j].hasProperty("use") &&
                       currResource.name[j].use == "official")) {
          name = currResource.name[j];
        }
      }
      nameStr = `${name.family}, ${name.given}`; 
      patients.push({
        pid : pid,
        name : nameStr,
        gender : currResource.gender,
        dob : moment(currResource.birthDate).format('DD.MMM.YYYY')
       });
  }
  return patients_list_tmpl({patients, prevUrl, nextUrl});
}
