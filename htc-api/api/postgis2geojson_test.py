#
# Test stub for module access to postgis2geojson
#

import psycopg2 as pg
import postgis2geojson as p2g


con = pg.connect(host="hsi.mitre.org", port=5432, database="hsi", user="hsi_ro", password="hsi_123")
cur = con.cursor()
#cur.execute("select * from sc.sc_worship")
#for record in cur:
#	print record


sql = "select id, source, ST_AsGeoJSON(location) as geometry, name from sc.sc_worship"
p2g.argsd["pretty"] = True

gj = p2g.getData(con, sql)
outfile = open("tmp.geojson", "w")
outfile.write(gj)
