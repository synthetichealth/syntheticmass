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

const BASE_URL_CCDA = BASE_URL + 'api/v1/synth/ccda/id/';
const CONDITION_SYSTEM_URL = "http://snomed.info/sct";
const CODE_DIABETES = '44054006';


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
    /* Temporarily remove the reverse includes for use with the GO FHIR server */
    /* for (var i = 0; i < revIncludeTables.length; i++) {
      revIncludeStr += '&_revInclude=' + revIncludeTables[i];
    } */

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
      params = $.param({_format:format,_count:count,patient:pid,['_sort:desc']:'date',date:`>=${tenYearsAgo}`});
      attrUrl += "Observation";
      break;
    case ATTR_ALLERGY :
      params = $.param({_format:format,_count:count,patient:pid})
      attrUrl += "AllergyIntolerance";
      break;
    case ATTR_CONDITION :
      params = $.param({_format:format,_count:count,patient:pid,['_sort:desc']:'onset'});
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

function getPatientDownloadUrl({id = 0, revIncludeTables = ['*'], count = 20}, format=FORMAT_JSON) {
  var paramObj = {_id : id, _count : count, _format : format};
  var revIncludeStr = '';

  for (var i = 0; i < revIncludeTables.length; i++) {
    revIncludeStr += '&_revInclude=' + revIncludeTables[i];
  }
  const param = $.param( {_id : id, _count : count, _format : format } );
  // temporarily remove the revInclude string for the Go FHIR server
  return BASE_URL + 'Patient?' + param; // + revIncludeStr;
}

function getPatientDownloadCcda(identifier) {
  return BASE_URL_CCDA + identifier;  
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
    this.address = this._extractAddress(obj);
    
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
    this.jsonUri = getPatientDownloadUrl(this.pid);
    this.ccdaUri = getPatientDownloadCcda(this._extractPatientIdentifier(obj));

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
  _extractObservations(observations) {
    if (this.observations === undefined) {
      this.observations = [];
    }
    const fmt = d3.format(".2f");
    let effDate = _NA,
        obsValue = _NA,
        obsUnit = "";
    for (const observation of observations) {
      if (observation.resource.hasOwnProperty("effectiveDateTime")) {
        effDate = moment(observation.resource.effectiveDateTime).format("DD.MMM.YYYY hh:mm");
      }
      if (observation.resource.hasOwnProperty("valueQuanity") || (observation.resource['valueQuantity'] != undefined)) {
        obsValue = observation.resource.valueQuantity['value'];
        obsUnit = observation.resource.valueQuantity.unit;
      }
      this.observations.push({
        name:observation.resource.code.coding[0].display,
        code:observation.resource.code.coding[0].code,
        obsValue : fmt(obsValue),
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
      this.conditions.push({name:cond.resource.code.coding[0].display,onsetDate,resolveDate});
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
      return {city,state,line:address,postalCode} = resource.address[resource.address.length - 1];
    }
    return {city,state,address,postalCode}
  }
  _extractRaceAndEthnicity(resource) {
    let race=_NA,
        ethnicity = _NA;
    for (const ext of resource.extension) {
      if (ext.valueCodeableConcept.coding.length) {
        if (ext.url == 'http://hl7.org/fhir/StructureDefinition/us-core-race') {
          race = ext.valueCodeableConcept.coding[ext.valueCodeableConcept.coding.length - 1].display;
        }
        if (ext.url = 'http://hl7.org/fhir/StructureDefinition/us-core-ethnicity') {
          ethnicity = ext.valueCodeableConcept.coding[ext.valueCodeableConcept.coding.length - 1].display;
        }
     }
    return {race,ethnicity}
  }
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