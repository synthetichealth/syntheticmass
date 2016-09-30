"use strict";
import 'babel-polyfill';
import patients_list_tmpl from './templates/patients_list.hbs';
import patient_detail_tmpl from './templates/patient_detail.hbs';
import patient_detail__immunization_tmpl from './templates/patient_detail_immunization.hbs';
import patient_detail__condition_tmpl from './templates/patient_detail_condition.hbs';
import patient_detail__allergies_tmpl from './templates/patient_detail_allergies.hbs';
import patient_detail__observations_tmpl from './templates/patient_detail_observations.hbs';
import patient_detail__medications_tmpl from './templates/patient_detail_medications.hbs';

import moment from 'moment';

const BASE_URL = `${FHIR_HOST}`;
const FORMAT_JSON = "json";
const FORMAT_XML  = "xml";

const BASE_URL_CCDA = BASE_URL + 'htc/api/v1/synth/ccda/id/';
const CONDITION_SYSTEM_URL = "http://snomed.info/sct";
const CODE_DIABETES = '44054006';
const CODES = { 
  loinc : {
    weight : "29463-7",
    height : "8302-2"
  }
}
  
    


// Returns true if the layer is a condition, rather than something that can be added as a parameter
function addLayerParam(param, layer) {
  // If a layer is defined that restricts patient list data, add it as a parameter for the search
  switch (layer) {
    case "pct_male":
      param['gender'] = "male";
      return false;
    case "pct_female":
      param['gender'] = "female";
      return false;
    case "chr_diabetes":
      param['code'] = CONDITION_SYSTEM_URL + '|' + CODE_DIABETES;
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
      url :BASE_URL + 'Condition',
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
      url :BASE_URL + 'Patient',
      type : 'get',
      dataType:'json',
      data : param});
    return promise;
  }
}

function getPListDownloadUrl({city = '', revIncludeTables = ['*'], count = 20}, format=FORMAT_JSON, layer="") {
  var param = {};
  var revIncludeStr = '';

  if (addLayerParam(param, layer)) {
    param['_count'] = count * 2;
    param['patient.address-city'] = city;
    param['_include'] = 'Condition:patient';

    param = $.param( param );
    return BASE_URL + 'Condition?' + param;
  }
  else {
    param['_count'] = count;
    param['address-city'] = city;
    param['_format'] = format;
    for (var i = 0; i < revIncludeTables.length; i++) {
      revIncludeStr += '&_revinclude=' + revIncludeTables[i];
    }

    param = $.param( param );
    return BASE_URL + 'Patient?' + param + revIncludeStr;
  }
}


function loadPatientAttributes({format = 'json', count = 500,pid,attrType}){
  let params = {};
  let attrUrl = BASE_URL;
  const ajaxAttributes = function(url,params) {
    const promise = $.ajax({
      url : url,
      type : 'get',
      dataType:'json',
      data:params});
    return promise;
  }
  
  switch (attrType) {
    case ATTR_OBSERVATION : 
      //  ajaxRecordSet("Observation?_format=json&_count=500&patient=" + pId + "&date=>=" + tenYearsAgoString + "&_sort:desc=date", oIndex);
      const tenYearsAgo = moment(new Date()).subtract(10,'years').format("YYYY-MM-DD");
      params = $.param({_format:format,_count:count,patient:pid,['_sort:desc']:'date',date:`gte${tenYearsAgo}`});
      attrUrl += "Observation";
      break;
    case ATTR_ALLERGY :
      params = $.param({_format:format,_count:count,patient:pid})
      attrUrl += "AllergyIntolerance";
      break;
    case ATTR_CONDITION :
      params = $.param({_format:format,_count:count,patient:pid});
      attrUrl += "Condition";
      break;
    case ATTR_IMMUNIZATION :
      params = $.param({_format:format,_count:count,patient:pid,['_sort:desc']:'date'});
      attrUrl += "Immunization";
      break;
    case ATTR_MEDICATION_ORDER :
      params = $.param({_format:format,_count:count,patient:pid,['_sort:desc']:'datewritten'});
      attrUrl += "MedicationOrder";
      break;
    }
    return ajaxAttributes(attrUrl,params);
  }


export function loadPatient(pid = '') {
  const promise = $.ajax({
    url :BASE_URL + 'Patient/' + pid,
    type : 'get',
    dataType:'json'
  });
  return promise;
}

function getPatientDownloadUrl({id,revIncludeTables = ['*'], count = 20}, format=FORMAT_JSON) {
  var paramObj = {_id : id, _count : count, _format : format};
  var revIncludeStr = '';

  for (var i = 0; i < revIncludeTables.length; i++) {
    revIncludeStr += '&_revinclude=' + revIncludeTables[i];
  }
  const param = $.param( {_id : id, _count : count, _format : format } );
  return BASE_URL + 'Patient?' + param + revIncludeStr;
}

function getPatientDownloadCcda({id=0}) {
  return BASE_URL_CCDA + id;  
}

export function loadPaginationURL(url = '') {
  const promise = $.ajax({
    url: url,
    type: 'get',
    dataType:'json'
  });
  return promise;
}

export function generatePatientLocations(rawPatients) {
  let points = [];
  if (rawPatients.entry && rawPatients.entry.length) {
    for (const patient of rawPatients.entry) {
      const {id,extension} = patient.resource;
      for (const ext of extension) {
        if (ext.url == "http://standardhealthrecord.org/fhir/extensions/wkt-geospatialpoint") {
          points.push({point:ext.valueString,id});
        }
      }
    }
  }
  return points;
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
    const downloadUriJson = getPListDownloadUrl({city : city, count : 20}, FORMAT_JSON, dataLayer);
    return renderPatientsTable(currNodes, nextUrl, prevUrl, downloadUriJson);
  }
  else {
    console.log("Something went wrong with the search response.");
  }
}

export function displayPatientDetail(patientObj,elem) {
  let patient = new Patient(patientObj);
  $(elem).html(patient_detail_tmpl(patient)).show();
  patient.loadPatientAttributes(ATTR_OBSERVATION,elem);
  patient.loadPatientAttributes(ATTR_ALLERGY,elem);
  patient.loadPatientAttributes(ATTR_CONDITION,elem);
  patient.loadPatientAttributes(ATTR_IMMUNIZATION,elem);
  patient.loadPatientAttributes(ATTR_MEDICATION_ORDER,elem);
  _getPhoto(patient.gender);
} 

function _getPhoto(gender) {
  $.ajax({
  url: 'https://randomuser.me/api/?gender=' + gender,
  dataType: 'json',
  success: function(data) {
    $("#p_patient_photo").attr("src",(data.results[0].picture.large));
  }
});
}

function compareByBirthDate(a, b) {
  return new Date(a.resource.birthDate) - new Date(b.resource.birthDate);
}


function renderPatientsTable(pNodes = [], nextUrl, prevUrl, downloadUriJson) {
  pNodes.sort(compareByBirthDate);
  let patients = [];
  for (let i = 0; i < pNodes.length; i++) {
      let currResource = pNodes[i].resource;

      patients.push({
        pid : currResource.id,
        name : _getPatientNameStr(currResource),
        gender : currResource.gender,
        dob : _getPatientDOB(currResource)
       });
  }
  return patients_list_tmpl({patients, prevUrl, nextUrl, downloadUriJson});
}



/* Patient Class */
const _NA = 'n/a';

const ATTR_OBSERVATION = Symbol('Observation');
const ATTR_ALLERGY = Symbol('Allergy');
const ATTR_CONDITION = Symbol('Condition');
const ATTR_IMMUNIZATION = Symbol('Immunization');
const ATTR_MEDICATION_ORDER = Symbol('MedicationOrder');

/* Lookup functions to extract patient resource details */
class Patient {
  constructor(obj) {
    this.pid = obj.id;
    const name = this._extractPatientName(obj);
    this.familyName = name.familyName;
    this.givenName = name.givenName;
    this.gender = obj.gender || _NA;
    this.dob = this._extractPatientDOB(obj);
    this.age = this._computeAge(obj);
    const {isDeceased,deathDate} = this._extractDeceased(obj);
    this.isDeceased = isDeceased;
    this.deathDate = deathDate;
    this.address = this._extractAddress(obj);
    this.currBodyWeight = _NA;
    this.currHeight = _NA;
    this.communication = this._extractCommunication(obj);
    const {race,ethnicity} = this._extractRaceAndEthnicity(obj);
    this.race = race;
    this.ethnicity = ethnicity;
    this.resources = { immunizations:[], observations:[], allergies:[], conditions:[], medicationOrders : [] }
    this.conditions = [];
    this.immunizations = [];
    this.observations = [];
    this.allergies = [];
    this.medicationOrders = [];
    this.jsonUri = getPatientDownloadUrl({id:this.pid});
    this.ccdaUri = getPatientDownloadCcda({id:this._extractPatientIdentifier(obj)});
  }
  
  loadPatientAttributes(attrType) {
    const self = this;
    let promise = loadPatientAttributes({pid:this.pid,attrType});
    switch (attrType) {
      case ATTR_OBSERVATION : 
        promise.done((data) => {
          self._saveEntries(data,'observations');
          self._extractObservations(self.resources.observations);
          $("#p_observations").html(patient_detail__observations_tmpl({observations:self.observations}));
          $("#p_brief_wgt_val").html(self.currBodyWeight);
          $("#p_brief_hgt_val").html(self.currHeight);
        });
        break;
      case ATTR_ALLERGY :
        promise.done((data) => {
          self._saveEntries(data,'allergies');
          $("#p_allergies").html(patient_detail__allergies_tmpl({allergies:self.allergies}));
        });
        break;
      case ATTR_CONDITION :
        promise.done((rawResponse) => {
          self._saveEntries(rawResponse,'conditions');
          self._extractConditions(self.resources.conditions);
          $("#p_conditions").html(patient_detail__condition_tmpl({conditions:self.conditions}));
        });
        break;
      case ATTR_IMMUNIZATION : 
        promise.done((rawResponse) => {
          self._saveEntries(rawResponse,'immunizations');
          self._extractImmunizations(self.resources.immunizations);
          $("#p_vaccinations").html(patient_detail__immunization_tmpl({immunizations:self.immunizations}));
        })
        .fail(() => {
          $("#p_vaccinations").html("Error loading Immunizations");
        });
        break;
      case ATTR_MEDICATION_ORDER : 
        promise
          .done((rawResponse) => {
            self._saveEntries(rawResponse,'medicationOrders');
            self._extractMedicationOrders(self.resources.medicationOrders);
            $("#p_medications").html(patient_detail__medications_tmpl({medicationOrders:self.medicationOrders}));
          })
          .fail(() => {
            $("#p_medications").html("Error loading MedicationOrders");
          });
        break;
    }
  }
  _extractDeceased(patient) {
    const now = new Date();
    let isDeceased = false;
    let deathDate = null;
    if (patient.hasOwnProperty("deceasedDateTime")) {
      
      deathDate = moment(patient.deceasedDateTime).format("DD.MMM.YYYY");
      if (moment(deathDate).isBefore(moment(now))) {
        isDeceased = true;
      }
    }
    return {isDeceased,deathDate}
  }
      
  _extractObservations(observations) {
    if (this.observations === undefined) {
      this.observations = [];
    }
    const fmt = d3.format(".2f");
    let effDate = _NA,
        obsValue = _NA,
        obsUnit = "";
    for (const observation of observations) {
      const {effectiveDateTime,valueQuantity,component,code:{coding}={}} = observation.resource;
      if (effectiveDateTime) {
        effDate = moment(effectiveDateTime).format("DD.MMM.YYYY hh:mm");
      }
      if (valueQuantity) {
        obsValue = fmt(valueQuantity['value']);
        obsUnit = valueQuantity.unit;
      }
      if (coding.length && coding[0].display == "Blood Pressure") {
        if (component && component.length == 2) {
          let {valueQuantity,code:{coding}={}} = component[0];
          if (coding[0].code == "8480-6" && coding[0].display == "Systolic Blood Pressure") {
            obsValue = valueQuantity['value'].toString();
          }
          ({valueQuantity,code:{coding}={}} = component[1]);
          if (coding[0].code == "8462-4" && coding[0].display == "Diastolic Blood Pressure") {
            obsValue = obsValue.concat("/",valueQuantity['value'].toString());
            obsUnit = valueQuantity.unit;
          }
        }
      }
      if (this.currBodyWeight == _NA &&
       coding[0].hasOwnProperty("display") &&
       coding[0].display == "Body Weight" &&
       coding[0].code == CODES.loinc.weight) {
        this.currBodyWeight = fmt(valueQuantity.value) + " " + valueQuantity.unit;
      }
      if (this.currHeight == _NA &&
       coding[0].hasOwnProperty("display") &&
       coding[0].display == "Body Height" &&
       coding[0].code == CODES.loinc.height) {
        this.currHeight = fmt(valueQuantity.value) + " " + valueQuantity.unit;
      }
      this.observations.push({
        name:coding[0].display,
        code:coding[0].code,
        obsValue : obsValue,
        obsUnit : obsUnit,
        effDate:effDate});
    }
  }
  _extractMedicationOrders(medicationOrders) {
    if (this.medicationOrders === undefined) {
      this.medicationOrders = [];
    }
    let dateWritten = _NA;
    for (const medication of medicationOrders) {
      if (medication.resource.hasOwnProperty("dateWritten")) {
        dateWritten = moment(medication.resource.dateWritten).format("DD.MMM.YYYY");
      }
      this.medicationOrders.push({code:medication.resource.medicationCodeableConcept.coding[0].code,name:medication.resource.medicationCodeableConcept.coding[0].display,dateWritten});
    }
  }
  
  _extractAllergies(allergies) {
    if (this.allergies === undefined) {
      this.allergies = [];
    }
    let diagDate = _NA;
    for (const allergy of allergies) {
      if (allergy.resource.hasOwnProperty("recordedDate")) {
        diagDate = moment(allergy.resource.recordedDate).format("DD.MMM.YYYY");
      }
      this.allergies.push({name:allergy.resource.substance.coding[0].display,diagDate});
    }
  }
  
  _extractConditions(conditions) {
    if (this.conditions === undefined) {
      this.conditions = [];
    }
    let onsetDate = _NA,
        resolveDate = _NA;
    for (const cond of conditions) {
      if (cond.resource.hasOwnProperty("onsetDateTime")) {
        onsetDate = moment(cond.resource.onsetDateTime).format("DD.MMM.YYYY");
      }
      if (cond.resource.hasOwnProperty("abatementDateTime")) {
        resolveDate = moment(cond.resource.abatementDateTime).format("DD.MMM.YYYY");
      }
      this.conditions.push({name:cond.resource.code.coding[0].display,code:cond.resource.code.coding[0].code,onsetDate,resolveDate});
    }
  }
  
  _extractImmunizations(immunizations) {
    let vaccineKeyChecks = [];
    if (this.immunizations === undefined) {
      this.immunizations = [];
    }
    for (const vaccine of immunizations) {
      if (vaccineKeyChecks[vaccine.resource.vaccineCode.coding[0].code] == undefined) {
        this.immunizations.push({name:vaccine.resource.vaccineCode.coding[0].display,date:moment(vaccine.resource.date).format("DD.MMM.YYYY")});
        vaccineKeyChecks[vaccine.resource.vaccineCode.coding[0].code] = true;
      }
    }
  }
      
  _saveEntries(rawResponse,resource) {
    if (rawResponse.entry != undefined) {
      this.resources[resource] = this.resources[resource].concat(rawResponse.entry);
    }
  }
  _extractAddress(resource) {
    let city = _NA,
        state = _NA,
        address = [],
        postalCode = _NA;
    if (resource.address.length) {
      const {city,state,line,postalCode} = resource.address[resource.address.length - 1];
      return {city, state, address:line,postalCode};
    }
    return {city,state,address,postalCode}
  }
  _extractRaceAndEthnicity(resource) {
    let race=_NA,
        ethnicity = _NA;
    for (const ext of resource.extension) {
      const {url,valueCodeableConcept:{coding}={}} = ext;
        if (url === 'http://hl7.org/fhir/StructureDefinition/us-core-race') {
          race = coding[coding.length - 1].display;
        }
        if (url === 'http://hl7.org/fhir/StructureDefinition/us-core-ethnicity') {
          ethnicity = coding[coding.length - 1].display;
        }
     }
  return {race,ethnicity}
}
  
  _extractCommunication(resource) {
    let comms = _NA;
    if (resource.hasOwnProperty("communication")) {
      for ( const [i,comm] of resource.communication.entries()) {
        if ((comm.hasOwnProperty("preferred") && comm.preferred) || i == 0) {
         comms = comm.language.coding[0].display;
        }
      }
    }
    return comms;
  }
  
  _extractPatientName(resource) {
    return _getPatientName(resource);
  }
  _extractPatientDOB(resource) {
    return _getPatientDOB(resource);
  }
  // Given a patient's data, calculate his/her age using the birthdate
  // and either the deceased date or (if there is none yet)
  // the current date.
  _computeAge(resource) {
    if (resource.hasOwnProperty("deceasedDateTime")) {
      return moment(resource.deceasedDateTime).diff(resource.birthDate,'years');
    }
    else {
      return moment(new Date()).diff(resource.birthDate,'years');
    }
  }
  _extractPatientIdentifier(resource) {
    if (resource.hasOwnProperty("identifier")) {
      return resource.identifier[0].value;
    }
    return 0;
  }  
}


/* Utility functions */    
function _getPatientDOB(resource) {
  return moment(resource.birthDate).format('DD.MMM.YYYY');
}

function _getPatientName(resource) {
  let name = {};
  for (let j = 0; j < resource.name.length; j++) {
    if (j == 0 || (resource.name[j].hasProperty("use") &&
                   resource.name[j].use == "official")) {
      name = resource.name[j];
    }
  }
  return {familyName:name.family[0], givenName:name.given[0]};
}

function _getPatientId(resource) {
  return resource.id
}

function _getPatientNameStr(resource) {
  return ((name) => {return `${name.familyName}, ${name.givenName}`;})(_getPatientName(resource));
}
