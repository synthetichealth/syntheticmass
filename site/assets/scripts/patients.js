import patients_list_tmpl from './templates/patients_list.hbs';
import patient_detail_tmpl from './templates/patient_detail.hbs';

import moment from 'moment';

const FORMAT_JSON = symbol("json");
const FORMAT_XML  = symbol("xml");

const baseUrl = `${FHIR_HOST}`;
const baseUrlCcda = baseUrl + '/api/v1/synth/ccda/id/';
const conditionSystemUrl = "http://snomed.info/sct";

const codeDiabetes = 44054006;

// Returns true if the layer is a condition, rather than something that can be added as a parameter
export function addLayerParam(param, layer) {
  // If a layer is defined that restricts patient list data, add it as a parameter for the search
  switch (layer)
  {
    case "pct_male":
      param['gender'] = "male";
      return false;
    case "pct_female":
      param['gender'] = "female";
      return false;
    case "chr_diabetes":
      param['code'] = conditionSystemUrl + '|' + codeDiabetes;
      return true;
    default:
      break;
  }
  return false;
}

export function loadPatients({city = '', count = 20}, layer = '') {
  var param = {};

  if (addLayerParam(param, layer)) {
    param['_count'] = count * 2;
    param['patient.address-city'] = city;
    param['_include'] = 'Condition:patient';

    param = $.param( param );
    const promise = $.ajax({
      url :baseUrl + 'Condition',
      type : 'get',
      dataType:'json',
      data : param});
    return promise;
  }
  else {
    param['_count'] = count;
    param['address-city'] = city;

    param = $.param( param );
    const promise = $.ajax({
      url :baseUrl + 'Patient',
      type : 'get',
      dataType:'json',
      data : param});
    return promise;
  }
}

export function getPListDownloadUrl({city = '', count = 20}, format=FORMAT_JSON, layer="") {
  var param = {};
  if (addLayerParam(param, layer)) {
    param['_count'] = count * 2;
    param['patient.address-city'] = city;
    param['_include'] = 'Condition:patient';

    param = $.param( param );
    return baseUrl + 'Condition?' + param;
  }
  else {
    param['_count'] = count;
    param['address-city'] = city;
    param['_format'] = format;

    param = $.param( param );
    return baseUrl + 'Patient?' + param;
  }
}

export function loadPatient(pid = '') {
  const promise = $.ajax({
    url :baseUrl + 'Patient/' + pid,
    type : 'get',
    dataType:'json'
  });
  return promise;
}

export function getPatientDownloadUrl({id = 0, revIncludeTables = ['*'], count = 20}, format=FORMAT_JSON) {
  var paramObj = {_id : id, _count : count, _format = format};
  var revIncludeStr = '';

  for (var i = 0; i < revIncludeTables.length; i++) {
    revIncludeStr += '&_revInclude=' + revIncludeTables[i];
  }
  const param = $.param( {_id : id, _count : count, _format = format } );
  return baseUrl + 'Patient?' + param + revIncludeStr;
}

export function getPatientDownloadCcda(identifier) {
  return baseUrlCcda + identifier;  
}

export function loadPaginationURL(url = '') {
  const promise = $.ajax({
    url: url,
    type: 'get',
    dataType:'json'
  });
  return promise;
}

export function generatePatientsHTML(rawResponse, city = "", dataLayer = "") {
  let nextUrl = "",
      prevUrl = "",
      currNodes;
  if (rawResponse.resourceType === "Bundle") {
    if (rawResponse.entry != undefined) {
      currNodes = rawResponse.entry.filter(function(rawNode) {
        return rawNode.resource.resourceType == "Patient";
      });
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
    var downloadUriJson = getPListDownloadUrl({city : city, count : 20}, FORMAT_JSON, dataLayer);
    return renderPatientsTable(currNodes, nextUrl, prevUrl, downloadUriJson);
  }
  else {
    console.log("Something went wrong with the search response.");
  }
}

export function generatePatientDetail(json) {
  const {familyName,givenName} = _getPatientName(json);
  const jsonUri = getPatientDownloadUrl(_getPatientId(json));
  const ccdaUri = getPatientDownloadCcda(_getPatientIdentifier(json));
  return patient_detail_tmpl({familyName,givenName, jsonUri, ccdaUri});

}


function compareByBirthDate(a, b) {
  return new Date(a.resource.birthDate) - new Date(b.resource.birthDate);
}

function renderPatientsTable(pNodes, nextUrl, prevUrl, downloadUriJson) {
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
  return patients_list_tmpl({patients, prevUrl, nextUrl, downloadUriJson});
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

function _getPatientId(resource) {
  return resource.id
}

function _getPatientIdentifier(resource) {
  if (resource.hasProperty("identifier"))
  {
    return resource.identifier[0].value;
  }
  return 0;
}

function _getPatientNameStr(resource) {
  return ((name) => {return `${name.family}, ${name.given}`;})(_getPatientName(resource));
}