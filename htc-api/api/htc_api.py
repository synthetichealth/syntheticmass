#!flask/bin/python
from flask import Flask, jsonify, request, abort, g, send_from_directory
from flask_cors import CORS
from flask.ext.autodoc import Autodoc
from flask_cache import Cache

import logging
import re

#need simplejson to deal with Postgres Decimal types
import simplejson as json

#NOTE: may need to run on Linux: "ln -s /usr/local/pgsql/lib/libpq.so.5 /usr/lib64/libpq.so.5"
import psycopg2 as pg
import psycopg2.pool as pgp
import sys
import time

import postgis2geojson as p2g
from psycopg2.extras import RealDictCursor

app = Flask(__name__)

# define the cache config, register the cache instance, and bind it to the app 
cache = Cache(app,config={'CACHE_TYPE': 'simple'})

CORS(app)
auto = Autodoc(app)

global pool
global log


#Postgres connection management
def setup_pool():
    global pool
    with open('htc_login.txt') as f:
      #each of these is expected to appear on  a separate line
      host = f.readline().rstrip()
      port = f.readline().rstrip()
      db   = f.readline().rstrip()
      user = f.readline().rstrip()
      pw   = f.readline().rstrip()
      pool = pgp.ThreadedConnectionPool(20, 100, host=host, port=port, database=db, user=user, password=pw)


#get current db connection if holding one, otherwise get a new one from the pool
def get_db_con():
    global pool
    max_attempts = 10
    con = getattr(g, '_database', None)
    if con is None:
        #Need to get a connection, use a try loop to handle pool depletions a bit better 
        #Otherwise psycopg2.pool throws exception and server returns 500 error to client
        for attempt in range(1, max_attempts):
            try:
                 con = g._database = pool.getconn()
                 if (attempt > 1):
                     log.debug("connection newly acquired from pool, attempt=%s" % attempt)
                 return con
            except:
                 #On any errors, add exponentially increasing time delays.
                 #This seems to handle at least 30X the pool size in requests without hard errors.
                 e = sys.exc_info()[0]
                 log.error("exception during connection attempt=%s: %s" % (attempt, e))
                 if (attempt == max_attempts):
                     #give up!
                     raise
                 time.sleep(attempt**2)
    else:
      log.debug("connection reused from session variable.")
    con.autocommit = True
    return con


#Automatically return db connections
@app.teardown_appcontext
def return_db_con(exception):
    global pool
    con = getattr(g, '_database', None)
    if con is not None:
        pool.putconn(con)
        #log.debug("connection returned to pool.")


#format simple data for return as JSON
def getData(conn, query, params=None):
    "Use this for non-geometry SELECTs, produces plain json based on DB field names"
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        if (params):
            cur.execute(query, params)
        else:
            cur.execute(query)
	return json.dumps(cur.fetchall(), indent=2)


#removes CR LF characters from string, for safer logging
def sanitize(s):
  return re.sub("[\r\n]+", " ", s)


#Get IP of client making the call, TO BE USED FOR DEBUGGING PURPOSES ONLY!
#Should handle running behind proxy, but could be subject to spoofing
#Reference: http://esd.io/blog/flask-apps-heroku-real-ip-spoofing.html
def get_ip():
    if not request.headers.getlist("X-Forwarded-For"):
        ip = request.remote_addr
    else:
        ip = request.headers.getlist("X-Forwarded-For")[0]
    #be sure to remove any CRLF characters, to limit log entry spoofing
    return sanitize(ip)


#
#API calls
#

#Documentation Index
@app.route('/htc/api/v1')
@cache.cached(timeout=300) # cache this view for 5 minutes
def documentation():
    return auto.html(title='MA High Tech Counsel API Documentation')


#All Counties
#
#Request geojson of all counties
@app.route('/htc/api/v1/counties', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_counties_all():
    """Counties in GeoJSON"""
    log.debug("entering get_counties_all() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate as chr_hs_grad, chr.college as chr_college, chr.unemployed as chr_unemployed, chr.diabetes_rate as chr_diabetes, " \
	"chr.adult_obesity as chr_adult_obesity, chr.adult_smoking as chr_adult_smoking, opioid.deaths as opioid_deaths, " \
        "ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN tiger_cb14_500k.county g ON g.statefp = '25' AND g.countyfp = s.ct_fips " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips"
    data = p2g.getData(con, sql)
    log.debug("leaving get_counties_all()")
    return data

#Request geojson of all counties (synthetic data)
@app.route('/htc/api/v1/synth/counties', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_synth_counties_all():
    """Counties in GeoJSON synthetic"""
    log.debug("entering get_synth_counties_all() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
        "ST_AsGeoJSON(s.ct_poly) AS geometry, " \
        "d.rate as pct_diabetes " \
        "FROM synth_ma.synth_county_pop_stats s " \
        "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
        "WHERE d.disease_name = 'diabetes'"
    data = p2g.getData(con, sql)
    log.debug("leaving get_synth_counties_all()")
    return data

#Request list of all counties
@app.route('/htc/api/v1/counties/list', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_counties():
    """Counties list in JSON"""
    log.debug("entering get_counties() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT ct_name, ct_fips " \
      "FROM synth_ma.county_stats"
    data = getData(con, sql)
    log.debug("leaving get_counties()")
    return data

#Request list of all counties (synthetic)
@app.route('/htc/api/v1/synth/counties/list', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_synth_counties():
    """Counties list in JSON synthetic"""
    log.debug("entering get_synth_counties() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT ct_name, ct_fips " \
      "FROM synth_ma.synth_county_pop_stats"
    data = getData(con, sql)
    log.debug("leaving get_synth_counties()")
    return data

#Request list of disease names that we have statistics for (synthetic)
@app.route('/htc/api/v1/synth/diseases/list', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300)
def get_synth_diseases():
  """Disease list in JSON synthetic"""
  log.debug("entering get_synth_diseases() IP=%s" %get_ip())
  con = get_db_con()
  sql = "SELECT DISTINCT disease_name FROM synth_ma.synth_county_disease_stats"
  data = getData(con, sql)
  log.debug("leaving get_synth_diseases()")
  return data

#Request geojson of only the geometry of all counties
@app.route('/htc/api/v1/counties/geoms', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_counties_geom():
    """Counties in GeoJSON, geometry only"""
    log.debug("entering get_counties_geom() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT countyfp AS ct_fips, ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM tiger_cb14_500k.county WHERE statefp='25'"
    data = p2g.getData(con, sql)
    log.debug("leaving get_counties_geom()")
    return data

#Request only the statistics of all counties
@app.route('/htc/api/v1/counties/stats', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_counties_stats():
    """Counties in JSON, statistics only"""
    log.debug("entering get_counties_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate / 100 as chr_hs_grad, chr.college / 100 as chr_college, chr.unemployed / 100 as chr_unemployed, chr.diabetes_rate / 100 as chr_diabetes, " \
	"chr.adult_obesity / 100 as chr_adult_obesity, chr.adult_smoking / 100 as chr_adult_smoking, opioid.deaths as opioid_deaths " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips"
    data = getData(con, sql)
    log.debug("leaving get_counties_stats()")
    return data

#Request only the statistics of all counties (synthetic)
@app.route('/htc/api/v1/synth/counties/stats', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_synth_counties_stats():
    """Counties in JSON, statistics only synthetic"""
    log.debug("entering get_synth_counties_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
      "d.rate as pct_diabetes " \
      "FROM synth_ma.synth_county_pop_stats s " \
      "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
      "WHERE d.disease_name = 'diabetes'"
    data = getData(con, sql)
    log.debug("leaving get_synth_counties_stats()")
    return data

#Single County
#
#Request geojson of single county by name
@app.route('/htc/api/v1/counties/name/<string:ct_name>', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_name(ct_name):
    """County in GeoJSON, by name"""
    log.debug("entering get_county_by_name() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate as chr_hs_grad, chr.college as chr_college, chr.unemployed as chr_unemployed, chr.diabetes_rate as chr_diabetes, " \
	"chr.adult_obesity as chr_adult_obesity, chr.adult_smoking as chr_adult_smoking, opioid.deaths as opioid_deaths, " \
        "ST_AsGeoJSON(s.ct_poly) AS geometry " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN tiger_cb14_500k.county g ON g.statefp = '25' AND g.countyfp = s.ct_fips " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips " \
      "WHERE ct_name=%s"
    sql_params = (ct_name.title(),)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_county_by_name()")
    return data

#Request geojson of single county by name (synthetic)
@app.route('/htc/api/v1/synth/counties/name/<string:ct_name>', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_synth_county_by_name(ct_name):
    """County in GeoJSON, by name synthetic"""
    log.debug("entering get_synth_county_by_name() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
        "ST_AsGeoJSON(s.ct_poly) AS geometry, " \
        "d.rate AS pct_diabetes " \
      "FROM synth_ma.synth_county_pop_stats s " \
      "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
      "WHERE s.ct_name = %s AND d.disease_name = 'diabetes'"
    sql_params = (ct_name.title(),)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_synth_county_by_name()")
    return data

#Request geojson of only the geometry of a single county by name
@app.route('/htc/api/v1/counties/name/<string:ct_name>/geom', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_name_geom(ct_name):
    """County in GeoJSON, by name, geometry only"""
    log.debug("entering get_county_by_name_geom() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT countyfp AS ct_fips, ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM tiger_cb14_500k.county " \
      "WHERE statefp='25' AND name=%s"
    sql_params = (ct_name.title(),)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_county_by_name_geom()")
    return data

#Request only the statistics of a single county by name
@app.route('/htc/api/v1/counties/name/<string:ct_name>/stats', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_name_stats(ct_name):
    """County in JSON, by name, statistics only"""
    log.debug("entering get_county_by_name_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate as chr_hs_grad, chr.college as chr_college, chr.unemployed as chr_unemployed, chr.diabetes as chr_diabetes, " \
	"chr.adult_obesity as chr_adult_obesity, chr.adult_smoking as chr_adult_smoking, opioid.deaths as opioid_deaths " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips " \
      "WHERE s.ct_name=%s"
    sql_params = (ct_name.title(),)
    data = getData(con, sql, sql_params)
    log.debug("leaving get_county_by_name_stats()")
    return data

#Request only the statistics of a single county by name (synthetic)
@app.route('/htc/api/v1/synth/counties/name/<string:ct_name>/stats', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_synth_county_by_name_stats(ct_name):
    """County in JSON, by name, statistics only (synthetic)"""
    log.debug("entering get_synth_county_by_name_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
      "d.rate as pct_diabetes " \
      "FROM synth_ma.synth_county_pop_stats s " \
      "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
      "WHERE s.ct_name = %s AND d.disease_name = 'diabetes'"
    sql_params = (ct_name.title(),)
    data = getData(con, sql, sql_params)
    log.debug("leaving get_synth_county_by_name_stats()")
    return data

#Request single county by county id
@app.route('/htc/api/v1/counties/id/<string:ct_fips>', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_id(ct_fips):
    """County in GeoJSON, by id"""
    log.debug("entering get_county_by_id() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate as chr_hs_grad, chr.college as chr_college, chr.unemployed as chr_unemployed, chr.diabetes_rate as chr_diabetes, " \
	"chr.adult_obesity as chr_adult_obesity, chr.adult_smoking as chr_adult_smoking, opioid.deaths as opioid_deaths, " \
        "ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN tiger_cb14_500k.county g ON g.statefp = '25' AND g.countyfp = s.ct_fips " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips " \
      "WHERE ct_fips=%s"
    sql_params = (ct_fips,)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_county_by_id()")
    return data

#Request single county by county id (synthetic)
@app.route('/htc/api/v1/synth/counties/id/<string:ct_fips>', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_synth_county_by_id(ct_fips):
    """County in GeoJSON, by id (synthetic)"""
    log.debug("entering get_synth_county_by_id() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
        "d.rate as pct_diabetes, " \
        "ST_AsGeoJSON(s.ct_poly) AS geometry " \
      "FROM synth_ma.synth_county_pop_stats s " \
      "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
      "WHERE s.ct_fips = %s AND d.disease_name = 'diabetes'"
    sql_params = (ct_fips,)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_synth_county_by_id()")
    return data

#Request geojson of only geometry of a single county by county id
@app.route('/htc/api/v1/counties/id/<string:ct_fips>/geom', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_id_geom(ct_fips):
    """County in GeoJSON, by id, geometry only"""
    log.debug("entering get_county_by_id_geom() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT countyfp AS ct_fips, ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM tiger_cb14_500k.county " \
      "WHERE statefp='25' AND countyfp=%s"
    sql_params = (ct_fips,)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_county_by_id_geom()")
    return data

#Request only the statistics of a single county by county id
@app.route('/htc/api/v1/counties/id/<string:ct_fips>/stats', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_county_by_id_stats(ct_fips):
    """County in JSON, by id, statistics only"""
    log.debug("entering get_county_by_id_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
        "chr.hs_graduate as chr_hs_grad, chr.college as chr_college, chr.unemployed as chr_unemployed, chr.diabetes_rate as chr_diabetes, " \
	"chr.adult_obesity as chr_adult_obesity, chr.adult_smoking as chr_adult_smoking, opioid.deaths as opioid_deaths " \
      "FROM synth_ma.county_stats s " \
      "JOIN synth_ma.ma_opioid_county opioid ON opioid.countyfp = s.ct_fips AND opioid.year = '2015' " \
      "JOIN county_health.chr ON chr.statefp = '25' AND chr.release_year = 2016 AND chr.countyfp = s.ct_fips " \
      "WHERE ct_fips=%s"
    sql_params = (ct_fips,)
    data = getData(con, sql, sql_params)
    log.debug("leaving get_county_by_id_stats()")
    return data

#Request only the statistics of a single county by county id (synthetic)
@app.route('/htc/api/v1/synth/counties/id/<string:ct_fips>/stats', methods=['GET'])
@auto.doc()
@cache.memoize(timeout=300) # cache this view for 5 minutes
def get_synth_county_by_id_stats(ct_fips):
    """County in JSON, by id, statistics only (synthetic)"""
    log.debug("entering get_synth_county_by_id_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.sq_mi, s.pop, CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, s.pop_sm, " \
        "d.rate as pct_diabetes " \
      "FROM synth_ma.synth_county_pop_stats s " \
      "JOIN synth_ma.synth_county_disease_stats d ON d.ct_fips = s.ct_fips " \
      "WHERE s.ct_fips = %s AND d.disease_name = 'diabetes'"
    sql_params = (ct_fips,)
    data = getData(con, sql, sql_params)
    log.debug("leaving get_synth_county_by_id_stats()")
    return data

#
# All cousub requests
#
#Request geojson of all cousubs
@app.route('/htc/api/v1/cousubs', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_cousub_all():
    """Cousubs in GeoJSON"""
    log.debug("entering get_cousub_all() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.cs_fips, s.cs_name, s.sq_mi, s.pop, s.pop_sm, " \
        "CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, " \
        "CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, " \
	"op.deaths AS opioid_deaths, " \
        "ST_AsGeoJSON(g.the_geom) AS geometry " \
    	"FROM synth_ma.cousub_stats s " \
	"JOIN tiger_cb14_500k.cousub g ON g.statefp = '25' AND g.countyfp = s.ct_fips AND g.cousubfp = s.cs_fips AND s.cs_fips != '00000' " \
	"JOIN synth_ma.ma_opioid2 op ON op.cousubfp = s.cs_fips AND s.cs_fips != '00000' AND year = '2015'"
    data = p2g.getData(con, sql)
    log.debug("leaving get_cousub_all()")
    return data

#Request geojson of all cousubs (synthetic)
@app.route('/htc/api/v1/synth/cousubs', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_synth_cousub_all():
    """Cousubs in GeoJSON (synthetic)"""
    log.debug("entering get_synth_cousub_all() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.cs_fips, s.cs_name, s.sq_mi, s.pop, s.pop_sm, " \
        "CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, " \
        "CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, " \
        "d.rate as pct_diabetes, " \
        "ST_AsGeoJSON(s.cs_poly) AS geometry " \
        "FROM synth_ma.synth_cousub_pop_stats s " \
        "JOIN synth_ma.synth_cousub_disease_stats d ON d.cs_fips = s.cs_fips " \
        "WHERE d.disease_name = 'diabetes'"
    data = p2g.getData(con, sql)
    log.debug("leaving get_synth_cousub_all()")
    return data

#Request geojson of only the geometry of all cousubs
@app.route('/htc/api/v1/cousubs/geoms', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_cousub_geom():
    """Cousubs in GeoJSON, geometry only"""
    log.debug("entering get_cousub_geom() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT countyfp AS ct_fips, cousubfp AS cs_fips, ST_AsGeoJSON(the_geom) AS geometry " \
      "FROM tiger_cb14_500k.cousub " \
      "WHERE statefp='25' AND cousubfp != '00000'"
    data = p2g.getData(con, sql)
    log.debug("leaving get_cousub_geom()")
    return data

#Request only the statistics of all cousubs
@app.route('/htc/api/v1/cousubs/stats', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_cousub_stats():
    """Cousubs in JSON, statistics only"""
    log.debug("entering get_cousub_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.cs_fips, s.cs_name, s.sq_mi, s.pop, s.pop_sm, " \
        "CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, " \
        "CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, " \
	"op.deaths AS opioid_deaths " \
      "FROM synth_ma.cousub_stats s " \
	"JOIN synth_ma.ma_opioid2 op ON op.cousubfp = s.cs_fips AND s.cs_fips != '00000' AND year = '2015' " \
      "WHERE s.cs_fips != '00000'"
    data = getData(con, sql)
    log.debug("leaving get_cousub_stats()")
    return data

#Request only the statistics of all cousubs (synthetic)
@app.route('/htc/api/v1/synth/cousubs/stats', methods=['GET'])
@auto.doc()
@cache.cached(timeout=300) # cache this view for 5 minutes
def get_synth_cousub_stats():
    """Cousubs in JSON, statistics only (synthetic)"""
    log.debug("entering get_synth_cousub_stats() IP=%s" % get_ip())
    con = get_db_con()
    sql = "SELECT s.ct_fips, s.ct_name, s.cs_fips, s.cs_name, s.sq_mi, s.pop, s.pop_sm, " \
        "CASE WHEN s.pop > 0 THEN s.pop_male / s.pop ELSE 0 END AS pct_male, " \
        "CASE WHEN s.pop > 0 THEN s.pop_female / s.pop ELSE 0 END AS pct_female, " \
        "d.rate as pct_diabetes " \
      "FROM synth_ma.synth_cousub_pop_stats s " \
      "JOIN synth_ma.synth_cousub_disease_stats d ON d.cs_fips = s.cs_fips " \
      "WHERE d.disease_name = 'diabetes'"
    data = getData(con, sql)
    log.debug("leaving get_synth_cousub_stats()")
    return data

#Block level, with filtering
#Example: /htc/api/v1/block_window?minx=-71.26&maxx=-71.22&miny=42.49&maxy=42.51
@app.route('/htc/api/v1/block_window', methods=['GET'])
@auto.doc()
def get_block_window():
    """Blocks in GeoJSON, by window 
    Example: /htc/api/v1/block_window?minx=-71.26&maxx=-71.22&miny=42.49&maxy=42.51
    """
    log.debug("entering get_block_window() IP=%s" % get_ip())
    minx = request.args.get('minx')
    maxx = request.args.get('maxx')
    miny = request.args.get('miny')
    maxy = request.args.get('maxy')
    if not (minx and maxx and miny and maxy):
        abort(404)
    con = get_db_con()
    sql = "SELECT s.block_id, s.sq_mi, s.pop, s.pop_male / s.pop as pct_male, s.pop_female / s.pop as pct_female, s.pop_sm, " \
      "ST_AsGeoJSON(s.blk_poly) AS geometry " \
      "FROM synth_ma.blk_stats s " \
      "WHERE s.blk_poly && ST_SetSRID(ST_MakeBox2D(ST_Point(%s,%s),  ST_Point(%s,%s)), 4269) AND s.pop > 0"
    sql_params = (minx, miny, maxx, maxy)
    data = p2g.getData(con, sql, sql_params)
    log.debug("leaving get_block_window()")
    return data

##TODO

#return ccda
@app.route('/htc/api/v1/synth/ccda/id/<string:patient_uuid>', methods=['GET'])
@auto.doc()
# this view should not be cached
def get_synth_ccda_by_id(patient_uuid):
    """Synthetic Patient in C-CDA, by id"""
    log.debug("entering get_synth_ccda_by_id() IP=%s" % get_ip())
    return send_from_directory('/ccda', patient_uuid + '.xml')


#Specific requests for less typing
#
#Request geojson of ?

if __name__ == '__main__':
    log = app.logger
    #Logging levels: CRITICAL: 50, ERROR: 40, WARNING: 30, INFO: 20, DEBUG: 10, NOTSET: 0
    log.setLevel(10)
    logging.basicConfig(format="%(asctime)-15s %(threadName)s  %(message)s")
    setup_pool()
    log.debug("starting server")
    app.run(debug=True, host="0.0.0.0", port=8080, threaded=True)
