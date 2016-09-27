--Reference Tables


SELECT *
FROM county_health.chr
WHERE release_year='2016'

SELECT *
--SUM(c.f1)--6,657,291
--COUNT(DISTINCT tract)--1,469 tracts
FROM acs_2014_5yr.acs_b0001 a--294,334 rows; These are not at the block level.
JOIN acs_2014_5yr.geography b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_b0002 c ON b.logical_rec_no=c.logical_rec_no AND b.state_abrev=c.state_abrev
WHERE b.state_abrev='ma'--6,463 rows
--AND b.tract IS NULL--These are at the tract level.
--AND b.tract='990000'
AND b.summary_level='140'--1,478 rows; Some tracts expand across multiple counties.
--AND b.summary_level='150'--4,985 block groups are accounted for.

SELECT tract, COUNT(*) Lines
FROM acs_2014_5yr.acs_b0001 a--294,334 rows; These are not at the block level.
JOIN acs_2013_5yr.geography b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
WHERE b.state_abrev='ma'--6,463 rows
AND b.summary_level='140'
GROUP BY tract
ORDER BY Lines DESC

SELECT *
FROM acs_2014_5yr.acs_s0001 a--284,612 rows
JOIN acs_2014_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
WHERE b.state_abrev='ma'--3,609 rows
ORDER BY b.logical_rec_no

SELECT *
FROM census.county_2010_dp1
WHERE x_state='PR'--14 counties

SELECT *
FROM census.tract_2010_dp1
LIMIT 10

--Previous model
SELECT a.county
, a.area_name
, b.f1 county_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, f.f94 median_age
, o.f171 median_household_income
, i.f181/i.f142*2 total_daily_commuting
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
FROM acs_2013_5yr.geography a
JOIN acs_2013_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2013_5yr.acs_s0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2013_5yr.acs_s0043 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2013_5yr.acs_s0023 i ON a.logical_rec_no=i.logical_rec_no AND a.state_abrev=i.state_abrev
JOIN acs_2013_5yr.acs_s0059 o ON a.logical_rec_no=o.logical_rec_no AND a.state_abrev=o.state_abrev
JOIN census.county_2010_dp1 r ON RIGHT(a.geoid,5)=r.geoid10
WHERE a.state_abrev IN ('sc')
AND a.summary_level ='050'
AND r.x_state='SC'
ORDER BY a.county

--Changes for 2014
SELECT a.county
, a.area_name
, b.f1 county_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, f.f94 median_age
, o.f171 median_household_income
, i.f181/i.f142*2 total_daily_commuting
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
FROM acs_2014_5yr.geography a
JOIN acs_2014_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_s0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2014_5yr.acs_s0042 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2014_5yr.acs_s0022 i ON a.logical_rec_no=i.logical_rec_no AND a.state_abrev=i.state_abrev
JOIN acs_2014_5yr.acs_s0058 o ON a.logical_rec_no=o.logical_rec_no AND a.state_abrev=o.state_abrev
JOIN census.county_2010_dp1 r ON RIGHT(a.geoid,5)=r.geoid10
WHERE a.state_abrev IN ('md')
AND a.summary_level ='050'
AND r.x_state='MD'
ORDER BY pct_black DESC

--New Model (US)
SELECT a.state_abrev
, a.county
, a.area_name
, b.f1 county_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, b.f143/b.f1 pct_asian
, b.f112/b.f1 pct_nativeamerican
, f.f94 median_age
, o.f171 median_household_income
, i.f181/i.f142*2 total_daily_commuting
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
, c.adult_obesity/100 pct_obesity
, c.diabetes_rate/100 pct_diabetic
, c.adult_smoking/100 pct_smokers
FROM acs_2014_5yr.geography a
JOIN acs_2014_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_s0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2014_5yr.acs_s0042 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2014_5yr.acs_s0022 i ON a.logical_rec_no=i.logical_rec_no AND a.state_abrev=i.state_abrev
JOIN acs_2014_5yr.acs_s0058 o ON a.logical_rec_no=o.logical_rec_no AND a.state_abrev=o.state_abrev
JOIN census.county_2010_dp1 r ON RIGHT(a.geoid,5)=r.geoid10
JOIN county_health.chr c ON a.state_fips=c.statefp AND a.county=c.countyfp
WHERE a.state_abrev !='pr'
AND a.summary_level ='050'
AND r.x_state !='PR'
AND c.release_year='2016'
ORDER BY a.state_fips, a.county

--New Model (MA)
SELECT a.state_abrev
, a.county
, a.area_name
, b.f1 county_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, b.f143/b.f1 pct_asian
, b.f112/b.f1 pct_nativeamerican
, f.f94 median_age
, o.f171 median_household_income
, i.f181/i.f142*2 total_daily_commuting
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
, c.adult_obesity/100 pct_obesity
, c.diabetes_rate/100 pct_diabetic
, c.adult_smoking/100 pct_smokers
FROM acs_2014_5yr.geography a
JOIN acs_2014_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_s0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2014_5yr.acs_s0042 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2014_5yr.acs_s0022 i ON a.logical_rec_no=i.logical_rec_no AND a.state_abrev=i.state_abrev
JOIN acs_2014_5yr.acs_s0058 o ON a.logical_rec_no=o.logical_rec_no AND a.state_abrev=o.state_abrev
JOIN census.county_2010_dp1 r ON RIGHT(a.geoid,5)=r.geoid10
JOIN county_health.chr c ON a.state_fips=c.statefp AND a.county=c.countyfp
WHERE a.state_abrev='sc'
AND a.summary_level = '050'
AND r.x_state='SC'
AND c.release_year='2016'
ORDER BY a.state_fips, a.county

--Tract level
SELECT a.county
, a.area_name
, b.f1 tract_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, b.f143/b.f1 pct_asian
, f.f94 median_age
, o.f171 median_household_income
, i.f181/i.f142*2 total_daily_commuting
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
FROM acs_2014_5yr.geography a
JOIN acs_2014_5yr.acs_b0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_b0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2014_5yr.acs_b0042 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2014_5yr.acs_b0022 i ON a.logical_rec_no=i.logical_rec_no AND a.state_abrev=i.state_abrev
JOIN acs_2014_5yr.acs_b0058 o ON a.logical_rec_no=o.logical_rec_no AND a.state_abrev=o.state_abrev
JOIN census.tract_2010_dp1 r ON RIGHT(a.geoid,11)=r.geoid10
WHERE a.state_abrev IN ('ma')
AND a.summary_level ='140'
AND b.f1>0 --1,464 populated tracts
ORDER BY pct_hispanic DESC