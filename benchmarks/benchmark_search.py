# Search Benchmarks
# This script is used to benchmark FHIR search against the 3 syntheticmass
# environments: dev, stg, and production. Benchmarks should be run immediately
# after mongodb is restarted to ensure consistent results.
from datetime import datetime
import sys
import os
import requests
from requests.packages.urllib3.exceptions import InsecureRequestWarning

requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

TIMEOUT = 60*5  # 1 minute

queries = [
    {
        "description": "Patient by given name",
        "query": "Patient?given={0}",
        "values": ["Andy155", "Kunze479", "Smith", "Foo"]
    },
    {
        "description": "Patient by family name",
        "query": "Patient?family={0}",
        "values": ["Andy155", "Kunze479", "Smith", "Foo"]
    },
    {
        "description": "Patient by name (incl. given, family, text)",
        "query": "Patient?name={0}",
        "values": ["Andy155", "Kunze479", "Smith", "Foo"]
    },
    {
        "description": "Patient by gender",
        "query": "Patient?gender={0}",
        "values": ["male", "female", "foo"]
    },
    {
        "description": "Patient by birthdate",
        "query": "Patient?birthdate={0}",
        "values": ["gt1962-03-07", "lt2015-01-01", "gte1975-11-20", "lte1984-06-06"]
    },
    {
        "description": "Patient by hard-to-pronounce cities in MA",
        "query": "Patient?address-city={0}",
        "values": ["Haverhill", "Worcester", "Leominster", "Leicester"]
    },
    {
        "description": "Condition by single code",
        "query": "Condition?code={0}",
        "values": ["44054006", "40055000", "36971009", "24079001"]
    },
    {
        "description": "Condition by multiple codes",
        "query": "Condition?code={0}",
        "values": ["40055000,36971009", "44054006,24079001"]
    },
    {
        "description": "Condition by code, _include Patient",
        "query": "Condition?&code={0}&_include=Condition:subject",
        "values": ["40055000", "36971009", "40055000,36971009"]
    },
    {
        "description": "Conditions, by Patient",
        "query": "Condition?subject=Patient/{0}",
        "values": ["58b36e973425def18537a747", "58b366463425def0f0f7e2ea", "58b366463425def0f0f7f52d"]
    },
    {
        "description": "Condition by code and age",
        "query": "Patient?birthdate={0}&_has:Condition:subject:code={1}",
        "values": [("gt1962-07-01", "24079001"), ("lt1982-04-03", "40055000")]
    },
    {
        "description": "Patient by reverse-chained Condition",
        "query": "Patient?_has:Condition:subject:code={0}",
        "values": ["44054006", "40055000", "36971009", "24079001"]
    },
    {
        "description": "Observation by code",
        "query": "Observation?code={0}",
        "values": ["29463-7", "55284-4", "8480-6,8462-4"]
    },
    {
        "description": "Observation by code and value-quantity",
        "query": "Observation?code={0}&value-quantity={1}",
        "values": [("2093-3", "200||mg/dL"), ("8462-4", "72||mmHg")]
    },
    {
        "description": "Observation by code and value, _include Patient",
        "query": "Observation?code={0}&value-quantity={1}&_include=Observation:subject",
        "values": [("2093-3", "200||mg/dL"), ("8462-4", "72||mmHg")]
    },
    {
        "description": "Patient, by reverse-chained Observation",
        "query": "Patient?_has:Observation:subject:code={0}",
        "values": ["29463-7", "55284-4", "8480-6,8462-4"]
    },
    {
        "description": "MedicationRequest by code",
        "query": "MedicationRequest?code={0}",
        "values": ["106258", "1049221", "860975"]
    },
    {
        "description": "MedicationRequest by code, _include Patient",
        "query": "MedicationRequest?code={0}&_include=MedicationRequest:patient",
        "values": ["106258", "1049221", "860975"]
    },
    {
        "description": "Patient, by reverse-chained MedicationRequest",
        "query": "Patient?_has:MedicationRequest:patient:code={0}",
        "values": ["106258", "1049221", "860975"]
    },
    {
        "description": "Procedures by code",
        "query": "Procedure?code={0}",
        "values": ["313191000", "428191000124101", "73761001"]
    },
    {
        "description": "Procedure by code and date",
        "query": "Procedure?code={0}&date={1}",
        "values": [("313191000", "gt1975-01-06"), ("428191000124101", "lte1950-04-19"), ("73761001","gt1950-01-01&date=lt1975-01-01")]
    },
    {
        "description": "Patient, by reverse-chained Procedure",
        "query": "Patient?_has:Procedure:patient:code={0}",
        "values": ["313191000", "428191000124101", "73761001"]
    },
    {
        "description": "Encounter by code",
        "query": "Encounter?type={0}",
        "values": ["185349003", "308646001", "170258001"]
    },
    {
        "description": "Encounter, by code and date",
        "query": "Encounter?type={0}&date={1}",
        "values": [("185349003", "gt1975-01-06"), ("308646001", "lte1950-04-19"), ("170258001","gt1950-01-01&date=lt1975-01-01")]
    },
    {
        "description": "Encounter, _include Patient",
        "query": "Encounter?type={0}&_include=Encounter:patient",
        "values": ["185349003", "308646001", "170258001"]
    },
    {
        "description": "Patient, by reverse-chained Encounter",
        "query": "Patient?_has:Encounter:patient:type={0}",
        "values": ["185349003", "308646001", "170258001"]
    },
    {
        "description": "Immunization by code",
        "query": "Immunization?vaccine-code={0}",
        "values": ["113", "133", "10"]
    },
    {
        "description": "Immunization by code and date",
        "query": "Immunization?vaccine-code={0}&date={1}",
        "values": [("113", "gt1975-01-06"), ("133", "lte1950-04-19"), ("10","gt1950-01-01&date=lt1975-01-01")]
    },
    {
        "description": "Immunization, _include Patient",
        "query": "Immunization?vaccine-code={0}&_include=Immunization:patient",
        "values": ["113", "133", "10"]
    },
    {
        "description": "Patient, by reverse-chained Immunization",
        "query": "Patient?_has:Immunization:patient:vaccine-code={0}",
        "values": ["113", "133", "10"]
    },
    {
        "description": "CarePlan by code",
        "query": "CarePlan?category={0}",
        "values": ["698358001", "698360004", "225358003"]
    },
    {
        "description": "CarePlan, by activity code",
        "query": "CarePlan?activitycode={0}",
        "values": ["439830001", "160670007", "710125008"]
    },
    {
        "description": "CarePlan, by code and date",
        "query": "CarePlan?category={0}&date={1}",
        "values": [("698358001", "gt1975-01-06"), ("698360004", "lte1950-04-19"), ("225358003","gt1950-01-01&date=lt1975-01-01")]
    },
    {
        "description": "CarePlan, _include Patient",
        "query": "CarePlan?category={0}&_include=CarePlan:patient",
        "values": ["698358001", "698360004", "225358003"]
    },
    {
        "description": "Patient, by reverse-chained CarePlan",
        "query": "Patient?_has:CarePlan:patient:activitycode={0}",
        "values": ["439830001", "160670007", "710125008"]
    }
]

# Read the server to query from args
args = sys.argv
if len(args) != 2:
    print "Must specify a FHIR server to query, e.g. 'https://syntheticmass-dev.mitre.org/fhir'"
    os.exit(1)

# If there's a trailing slash in the host, strip it
host = args[1].rstrip("/")

print "="*80
print "GoFHIR Search Benchmarks | {0}".format(datetime.now())
print "="*80

start = datetime.now()

# Query to see if totals are turned on
print "Host: " + host
r = requests.get(host + "/Patient", verify=False)
body = r.json()

if 'total' in body:
    print "Search result totals are enabled"
else:
    print "Search result totals are disabled"

print "Request timeout: " + str(TIMEOUT) + "s"
print ""

for q in queries:

    print q['description']

    for v in q['values']:
        if type(v) is tuple:
            querystr = q['query'].format(*v)
        else:
            querystr = q['query'].format(v)

        # Make the request and check the timing
        then = datetime.now()
        try:
            r = requests.get(host + "/" + querystr, verify=False, timeout=TIMEOUT)
        except requests.exceptions.ReadTimeout:
            print "TIMEOUT after {0}s, continuing... | {1}".format(TIMEOUT, querystr)
            continue
        now = datetime.now()

        delta = now - then

        if r.status_code == 200:
            print "200 OK  | {0:3d}s {1:7.3f}ms \t| {2}".format(delta.seconds, (delta.microseconds/1000.0), querystr)
        else:
            print "{0} ERR | {1:3d}s {2:7.3f}ms \t| {3}".format(r.status_code, delta.seconds, (delta.microseconds/1000.0), querystr)


    print ""

end = datetime.now()

print "="*80
print "Time elapsed: {0}".format(end-start)
print "="*80
