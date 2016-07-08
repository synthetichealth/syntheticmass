#!/bin/python

#NOTE: modified from original to be more module friendly (PS)
#Original source: https://github.com/jczaplew/postgis2geojson/blob/master/postgis2geojson.py

import argparse
import datetime
import decimal
import json
import subprocess

import psycopg2


#defaults for use as a module, possibly modified by the module user
global argsd 
argsd = {"geometry": "geometry", "pretty": False, "topojson": False}



# Fix to float decimals
# http://stackoverflow.com/questions/16957275/python-to-json-serialization-fails-on-decimal
def check_for_decimals(obj):
    if isinstance(obj, decimal.Decimal):
        return float(obj)
    raise TypeError


#Main entry point for module use.
#NOTE: does not handle records with null geometry gracefully (exception in json.loads: TypeError: expected string or buffer)
def getData(conn, query, params=None):
    """NOTE: expects one field in query to be "ST_AsGeoJSON(foo) as geometry"."""

    # Create a cursor for executing queries
    with conn.cursor() as cur:

        #print "query: " + query

        # Execute the query
        try:
            if (params):
                cur.execute(query, params)
            else:
                cur.execute(query)
        except Exception as exc:
            print "Unable to execute query. Error was {0}".format(str(exc))
            raise exc

        # Retrieve the results of the query
        rows = cur.fetchall()

        # Get the column names returned
        colnames = [desc[0] for desc in cur.description]

        # Find the index of the column that holds the geometry
        geomIndex = colnames.index('geometry')

        feature_collection = {'type': 'FeatureCollection', 'features': []}

        # For each row returned...
        for row in rows:
            feature = {
                'type': 'Feature',
                'geometry': json.loads(row[geomIndex]),
                'properties': {},
            }

            for index, colname in enumerate(colnames):
                if colname not in ('geometry'):
                    if isinstance(row[index], datetime.datetime):
                        # datetimes are not JSON.dumpable, manually stringify these.
                        value = str(row[index])
                    else:
                        value = row[index]
                    feature['properties'][colname] = value

            feature_collection['features'].append(feature)

        indent = 2 if argsd["pretty"] is True else None
        jsonified = json.dumps(feature_collection, indent=indent, default=check_for_decimals)
        cur.close()
        return jsonified

