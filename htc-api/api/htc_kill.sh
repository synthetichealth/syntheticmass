#!/bin/bash
#
# Script to kill flask python processes
# NOTE: sensitive to Python install location
#

FLASK_PIDS_TO_KILL=`ps ax | grep "python htc_api" | grep -v grep | awk '{print $1}'`
echo "FLASK_PIDS_TO_KILL = $FLASK_PIDS_TO_KILL"
kill -9 $FLASK_PIDS_TO_KILL