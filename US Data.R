#Libraries
library(scatterplot3d)
library(caret)

#Upload and view files
usa<-read.csv("/Users/amisra/Desktop/SyntheticMass/usa.csv")
summary(usa)
ma<-read.csv("/Users/amisra/Desktop/SyntheticMass/ma_counties.csv")
summary(ma)

#National rates
sum(usa$county_pop*usa$pct_obesity)/sum(usa$county_pop) #National obesity: 27.5%
sum(usa$county_pop*usa$pct_diabetic)/sum(usa$county_pop) #National diabetes: 10.2%
sum(usa$county_pop*usa$pct_smokers)/sum(usa$county_pop) #National smoking: 16.3%
sum(ma$county_pop*ma$pct_obesity)/sum(ma$county_pop) #Massachusetts obesity: 23.8%

#Obesity and diabetes
cor.test(usa$pct_obesity,usa$pct_diabetic) #.54
cor.test(usa$pct_obesity,usa$pct_smokers) #.61
cor.test(usa$pct_diabetic,usa$pct_smokers) #.56

#View race correlations
cor.test(usa$pct_nh_white,usa$pct_obesity) #-.10
cor.test(usa$pct_nh_white,usa$pct_diabetic) #-.45
cor.test(usa$pct_nh_white,usa$pct_smokers) #-.14
cor.test(usa$pct_black,usa$pct_obesity) #.38
cor.test(usa$pct_black,usa$pct_diabetic) #.52
cor.test(usa$pct_black,usa$pct_smokers) #.29
cor.test(usa$pct_hispanic,usa$pct_obesity) #-.25
cor.test(usa$pct_hispanic,usa$pct_diabetic) #.09
cor.test(usa$pct_hispanic,usa$pct_smokers) #-.26; negative w/ obesity and smoking, positive w/ diabetes
cor.test(usa$pct_asian,usa$pct_obesity) #-.36
cor.test(usa$pct_asian,usa$pct_diabetic) #-.26
cor.test(usa$pct_asian,usa$pct_smokers) #-.25
cor.test(usa$pct_nativeamerican,usa$pct_obesity) #.11
cor.test(usa$pct_nativeamerican,usa$pct_diabetic) #.12
cor.test(usa$pct_nativeamerican,usa$pct_smokers) #.35; most strongly correlated w/ smoking
cor.test(usa$pct_islander,usa$pct_obesity) #-.11
cor.test(usa$pct_multiracial,usa$pct_obesity) #-.12
#There is statistical significance, but correlations are weaker at the national level.

#Other obesity correlations
cor.test(usa$pct_college_grad,usa$pct_obesity) #-.62
cor.test(usa$pct_college_grad,usa$pct_diabetic) #-.58
cor.test(usa$pct_college_grad,usa$pct_smokers) #-.48
cor.test(usa$median_household_income,usa$pct_obesity) #-.49
cor.test(usa$median_household_income,usa$pct_diabetic) #-.68
cor.test(usa$median_household_income,usa$pct_smokers) #-.58
cor.test(usa$total_daily_commuting,usa$pct_obesity) #.09; still significant though
cor.test(usa$total_daily_commuting,usa$pct_diabetic) #.12; still significant
cor.test(usa$total_daily_commuting,usa$pct_smokers) #.08; significant weak correlation
cor.test(usa$median_age,usa$pct_obesity) #-.07; significant
cor.test(usa$median_age,usa$pct_diabetic) #.18; opposite from obesity
cor.test(usa$median_age,usa$pct_smokers) #-.19; Do younger people smoke more?
cor.test(usa$county_pop,usa$pct_obesity) #-.25; Do larger cities have lower obesity?
cor.test(usa$county_pop,usa$pct_diabetic) #-.13
cor.test(usa$county_pop,usa$pct_smokers) #-.17
cor.test(usa$large_county,usa$pct_obesity) #-.25
cor.test(usa$large_county,usa$pct_diabetic) #-.12
cor.test(usa$large_county,usa$pct_smokers) #-.18

#Non-obesity correlations
cor.test(usa$pct_college_grad,usa$median_household_income) #.69; confounding
cor.test(usa$pct_black,usa$median_household_income) #-.25; confounding
cor.test(usa$pct_black,usa$pct_college_grad) #-.10; weaker but possibly confounding
cor.test(usa$pct_nh_white,usa$pct_college_grad) #.0135; insignificant
cor.test(usa$pct_hispanic,usa$pct_college_grad) #.0102; insignificant
cor.test(usa$pct_asian,usa$pct_college_grad) #.48; very significant
cor.test(usa$pct_nativeamerican,usa$pct_college_grad) #-.073; significant
cor.test(usa$median_age,usa$pct_college_grad) #-.18; Are older people less likely to have degrees?
cor.test(usa$median_age,usa$pct_asian) #-.23; Asian communities appear to be younger.
cor.test(usa$county_pop,usa$pct_college_grad) #.32; larger counties are more educated.

#US models
us1<-lm(pct_obesity~pct_college_grad,data=usa)
summary(us1) #SE: .0352
us2<-lm(pct_obesity~pct_college_grad+pct_black,data=usa)
summary(us2) #SE: .0321
us3<-lm(pct_obesity~pct_college_grad+pct_black+total_daily_commuting,data=usa)
summary(us3) #SE: .0321
us4<-lm(pct_obesity~pct_college_grad+median_household_income,data=usa)
summary(us4) #SE: .0350
us5<-lm(pct_obesity~pct_college_grad+pct_black+pct_asian,data=usa)
summary(us5) #SE: .0319
us6<-lm(pct_obesity~pct_college_grad+pct_black+pct_hispanic+pct_asian,data=usa)
summary(us6) #SE: .0307
us7<-lm(pct_obesity~pct_college_grad+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(us7) #SE: .0303
us8<-lm(pct_obesity~pct_college_grad+pct_nh_white+pct_black+pct_asian+pct_nativeamerican+pct_islander+pct_multiracial,data=usa)
summary(us8) #SE: .0303 (better with fewer races)
us9<-lm(pct_obesity~pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(us9) #SE: .0293
us10<-lm(pct_obesity~pct_college_grad+median_age+total_daily_commuting+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(us10) #SE: .0292 (commute time not useful)
us11<-lm(pct_obesity~pct_college_grad+median_age+county_pop+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(us11) #SE: .0292 (county pop not helpful)
us12<-lm(pct_obesity~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(us12) #SE: .0231 (This allows the state to play a factor but still uses national demographics.)
us13<-lm(pct_obesity~large_county+state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_nativeamerican,data=usa)
summary(us13) #SE: .0230 (The percentage of Asians loses significance.)


#Test on MA (state as factor, best model so far)
model<-us12
ma$obesity_prediction<-predict(us12,newdata=ma,type="response")
summary(ma)
residual1<-ma$pct_obesity-ma$obesity_prediction
sd(residual1) #.0189
plot(ma$pct_obesity,residual1)
write.csv(ma,"/Users/amisra/Desktop/SyntheticMass/ma_predictions.csv")

#Test on MA (state neutral)
ma$obesity_prediction2<-predict(us9,newdata=ma,type="response")
summary(ma)
residual2<-ma$pct_obesity-ma$obesity_prediction2
sd(residual2) #.0190; The state model makes little difference for MA.
plot(ma$pct_obesity,residual2)
plot(residual1,residual2)
summary(residual1)
summary(residual2) #The state neutral model mostly overpredicts MA obesity.

#Test Model 13 on MA
ma$obesity_prediction<-predict(us13,newdata=ma,type="response")
summary(ma)
residual<-ma$pct_obesity-ma$obesity_prediction
sd(residual) #.0222

#Build and test on MA
ma_model<-lm(pct_obesity~pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=ma)
summary(ma_model) #SE: .0209; The small sample size leads to poor predictions.

#Test models on SC
sc<-read.csv("/Users/amisra/Desktop/SyntheticMass/sc.csv")
sc$obesity_prediction<-predict(us12,newdata=sc,type="response")
summary(sc)
residual_sc1<-sc$pct_obesity-sc$obesity_prediction
sd(residual_sc1) #.0236
sc$obesity_prediction2<-predict(us9,newdata=sc,type="response")
residual_sc2<-sc$pct_obesity-sc$obesity_prediction2
sd(residual_sc2) #.0222
plot(sc$pct_obesity,residual_sc1) #linear
plot(sc$pct_obesity,residual_sc2) #linear

#Logarithmic models
usa$log_obesity<-log(usa$pct_obesity)
ma$log_obesity<-log(ma$pct_obesity)
log_obesity_model<-lm(log_obesity~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(log_obesity_model) #e^(-.888-.0578-.8799*(percent college graduate)-.0044*(median age)+.2578*(percent black)-.1239*(percent Hispanic)-.2157*(percent Asian)+.1334*(percent Native American))
ma$obesity_prediction3<-exp(predict(log_obesity_model,newdata=ma,type="response"))
residual3<-ma$pct_obesity-ma$obesity_prediction3
sd(residual3) #.0190
plot(ma$pct_obesity,residual3)
plot(residual1,residual3)
plot(ma$pct_obesity,residual1-residual3)

#Test logarithmic and original on USA
usa$obesity_prediction3<-exp(predict(log_obesity_model,newdata=usa,type="response"))
residual3<-usa$pct_obesity-usa$obesity_prediction3
sd(residual3) #.0231
summary(usa)
usa$obesity_prediction<-predict(us12,newdata=usa,type="response") #They are about the same.

#Test on MA tracts
ma_tracts<-read.csv("/Users/amisra/Desktop/SyntheticMass/ma_tracts.csv")
summary(ma_tracts)
ma_tracts$log_obesity<-predict(log_obesity_model,newdata=ma_tracts,type="response")
summary(ma_tracts)
ma_tracts$predicted_obesity<-exp(ma_tracts$log_obesity)
write.csv(ma_tracts,"/Users/amisra/Desktop/SyntheticMass/ma_tracts_obesity.csv")

#Diabetes model
diabetes1<-lm(pct_diabetic~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(diabetes1) #.0083
diabetes2<-lm(pct_diabetic~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_nativeamerican,data=usa)
summary(diabetes2) #.0083
ma$diabetes_prediction2<-predict(diabetes2,newdata=ma,type="response")
summary(ma)
diabetes_residual<-ma$pct_diabetic-ma$diabetes2
sd(diabetes_residual) #.0056

#Log diabetes model
usa$log_diabetes<-log(usa$pct_diabetic)
ma$log_diabetes<-log(ma$pct_diabetic)
log_diabetes_model<-lm(log_diabetes~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_nativeamerican,data=usa)
summary(log_diabetes_model) #e^(-3.317+.289-.6548*(percent college graduate)-.0201*(median age)+.7647*(percent black)+.6396*(percent Hispanic)+.1334*(percent Native American))
ma$diabetes_prediction<-exp(predict(log_diabetes_model,newdata=ma,type="response"))
diabetes_residual<-ma$pct_diabetic-ma$diabetes_prediction
sd(diabetes_residual) #.0046

#Test obesity, diabetes, and smoking on MA towns
ma_towns<-read.csv("/Users/amisra/Desktop/SyntheticMass/ma_towns.csv")
summary(ma_towns)
ma_towns$log_obesity<-predict(log_obesity_model,newdata=ma_towns,type="response")
ma_towns$predicted_obesity<-exp(ma_towns$log_obesity)
ma_towns$log_diabetes<-predict(log_diabetes_model,newdata=ma_towns,type="response")
ma_towns$predicted_diabetes<-exp(ma_towns$log_diabetes)
ma_towns$log_smoking<-predict(log_smoking_model,newdata=ma_towns,type="response")
ma_towns$predicted_smoking<-exp(ma_towns$log_smoking)
write.csv(ma_towns,"/Users/amisra/Desktop/SyntheticMass/ma_towns_predictions.csv")

#Smoking model
smoking1<-lm(pct_smokers~state_abrev+pct_college_grad+median_age+pct_black+pct_asian+pct_hispanic+pct_nativeamerican,data=usa)
summary(smoking1) #.01474

#Log smoking model
usa$log_smoking<-log(usa$pct_smokers)
ma$log_smoking<-log(ma$pct_smokers)
log_smoking_model<-lm(log_smoking~state_abrev+pct_college_grad+median_age+pct_black+pct_hispanic+pct_asian+pct_nativeamerican,data=usa)
summary(log_smoking_model) #e^(-1.2616+.0037-.7446*(percent college graduate)-.0085*(median age)+.2910*(percent black)-.0769*(percent Hispanic)-.6390*(percent Asian)+.7535*(percent Native American))
ma$smoking_prediction<-exp(predict(log_smoking_model,newdata=ma,type="response"))
smoking_residual<-ma$pct_smokers-ma$smoking_prediction
sd(smoking_residual) #.0113

#Separating large and small counties
big_counties<-subset(usa,county_pop>=500000) # 48% live in counties with 500,000 or more people.
summary(big_counties)
small_counties<-subset(usa,county_pop<500000)
summary(small_counties)
sum(big_counties$county_pop) # 246,428,099 (78%) Americans live in counties with 100,000 or more people.
sum(usa$county_pop) # 314,092,011
