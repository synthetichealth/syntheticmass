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
, (g.f140+g.f141+g.f142+g.f143)/g.f119 pct_college_grad
, c.adult_obesity/100 pct_obesity
, c.diabetes_rate/100 pct_diabetic
, c.adult_smoking/100 pct_smokers
FROM acs_2014_5yr.geography a
JOIN acs_2014_5yr.acs_s0002 b ON a.logical_rec_no=b.logical_rec_no AND a.state_abrev=b.state_abrev
JOIN acs_2014_5yr.acs_s0003 f ON a.logical_rec_no=f.logical_rec_no AND a.state_abrev=f.state_abrev
JOIN acs_2014_5yr.acs_s0042 g ON a.logical_rec_no=g.logical_rec_no AND a.state_abrev=g.state_abrev
JOIN acs_2014_5yr.acs_s0040 h ON a.logical_rec_no=h.logical_rec_no AND a.state_abrev=h.state_abrev
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
WHERE a.state_abrev='ma'
AND a.summary_level = '050'
AND c.release_year='2016'
ORDER BY a.state_fips, a.county

--Town level
SELECT a.state_abrev
, a.county
, a.area_name
, b.f1 town_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, b.f143/b.f1 pct_asian
, b.f112/b.f1 pct_nativeamerican
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
JOIN census.county_sub_2010_dp1 r ON RIGHT(a.geoid,10)=r.geoid10
WHERE a.state_abrev IN ('ma')
AND a.summary_level ='060'
AND b.f1>0

--Tract level
SELECT a.state_abrev
, a.county
, a.area_name
, b.f1 tract_pop
, f.f32/b.f1 pct_nh_white
, b.f81/b.f1 pct_black--This includes Hispanic blacks.
, f.f63/b.f1 pct_hispanic
, b.f143/b.f1 pct_asian
, b.f112/b.f1 pct_nativeamerican
, f.f94 median_age
, o.f171 median_household_income
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