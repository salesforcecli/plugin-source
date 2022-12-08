# description

retrieve Profiles from the target org in a consistent and reproducible way

# examples

sfdx force:source:beta:profile:retrieve
sfdx force:source:beta:profile:retrieve --profiles "Admin, Security, Chatter Free User"
sfdx force:source:beta:profile:retrieve --profiles Admin

# profilesFlag

a comma separates list of Profiles to retrieve, default: \*

# profilesFlagLong

a comma separates list of Profiles to retrieve. If a Profile is written as "Chatter Free User.profile-meta.xml" then --profiles "Chatter Free User" will retrieve that profile
