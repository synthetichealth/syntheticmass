--Alzheimer's projections by state
SELECT b.state_fips
, a.state_abrev
, a.f1 population
, a.f20+a.f21+a.f22+a.f23+a.f24+a.f25+a.f44+a.f45+a.f46+a.f47+a.f48+a.f49 seniors
, c.f45+c.f60 white_65to74
, c.f46+c.f61 white_75to84
, c.f47+c.f62 white_85orolder
, a.f94+a.f109 black_65to74
, a.f95+a.f110 black_75to84
, a.f96+a.f111 black_85orolder
, c.f76+c.f91 hispanic_65to74
, c.f77+c.f92 hispanic_75to84
, c.f78+c.f93 hispanic_85orolder
, (.029*(c.f45+c.f60)+.109*(c.f46+c.f61)+.302*(c.f47+c.f62)+.091*(a.f94+a.f109)+.199*(a.f95+a.f110)+.586*(a.f96+a.f111)+.075*(c.f76+c.f91)+.279*(c.f77+c.f92)+.629*(c.f78+c.f93))*1.24/a.f1 pct_alz
FROM acs_2014_5yr.acs_s0002 a
JOIN acs_2014_5yr.geography b ON a.state_abrev=b.state_abrev AND a.logical_rec_no=b.logical_rec_no
JOIN acs_2014_5yr.acs_s0003 c ON b.state_abrev=c.state_abrev AND b.logical_rec_no=c.logical_rec_no
WHERE a.logical_rec_no='0000001'
AND a.state_abrev NOT IN ('us','pr')
ORDER BY b.state_fips

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
, (.029*(f.f45+f.f60)+.109*(f.f46+f.f61)+.302*(f.f47+f.f62)+.091*(b.f94+b.f109)+.199*(b.f95+b.f110)+.586*(b.f96+b.f111)+.075*(f.f76+f.f91)+.279*(f.f77+f.f92)+.629*(f.f78+f.f93))*1.24/b.f1 pct_alzheimers
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
ORDER BY pct_alzheimers

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
, (.029*(f.f45+f.f60)+.109*(f.f46+f.f61)+.302*(f.f47+f.f62)+.091*(b.f94+b.f109)+.199*(b.f95+b.f110)+.586*(b.f96+b.f111)+.075*(f.f76+f.f91)+.279*(f.f77+f.f92)+.629*(f.f78+f.f93))*1.24/b.f1 pct_alzheimers
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
ORDER BY pct_alzheimers