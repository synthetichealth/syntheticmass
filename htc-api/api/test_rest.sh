#!/bin/bash

#Tests out all API calls, to verify that they work.
#If optional process count argument is provided, acts as a front end for scalability testing.

SCRIPT="$0"
PID=$$

#This needs to be a fully resolved hostname inside of MITRE, when using proxy...
#HOST_PORT="http://hsi.mitre.org:8080"

#export http_proxy=
HOST_PORT="http://127.0.0.1:8080"

if [ "x$1" != "x" ]; then
  #This is the driving front end, for load testing
  PROCS="$1"
  for I in `seq 1 $PROCS` ; do
    nohup $SCRIPT > test/test_${I}.log 2>&1 &
  done
  exit
fi

#Actual work is performed here for spawned off scripts
mkdir -p test
cd test
echo "started: " `date`
wget -O counties.${PID}            ${HOST_PORT}/htc/api/v1/counties
wget -O counties_list.${PID}       ${HOST_PORT}/htc/api/v1/counties/list
wget -O counties_geoms.${PID}      ${HOST_PORT}/htc/api/v1/counties/geoms
wget -O counties_stats.${PID}      ${HOST_PORT}/htc/api/v1/counties/stats
wget -O counties_name.${PID}       ${HOST_PORT}/htc/api/v1/counties/name/Worcester
wget -O counties_name_geom.${PID}  ${HOST_PORT}/htc/api/v1/counties/name/Worcester/geom
wget -O counties_name_stats.${PID} ${HOST_PORT}/htc/api/v1/counties/name/Worcester/stats
wget -O counties_id.${PID}         ${HOST_PORT}/htc/api/v1/counties/id/027
wget -O counties_id_geom.${PID}    ${HOST_PORT}/htc/api/v1/counties/id/027/geom
wget -O counties_id_stats.${PID}   ${HOST_PORT}/htc/api/v1/counties/id/027/stats
wget -O cousubs.${PID}             ${HOST_PORT}/htc/api/v1/cousubs
wget -O cousubs_geoms.${PID}       ${HOST_PORT}/htc/api/v1/cousubs/geoms
wget -O cousubs_stats.${PID}       ${HOST_PORT}/htc/api/v1/cousubs/stats

wget -O block_win.${PID}           ${HOST_PORT}/htc/api/v1/block_window?minx=-71.26\&maxx=-71.22\&miny=42.49\&maxy=42.51

echo "finished: " `date`
