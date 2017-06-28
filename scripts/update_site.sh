#!/bin/bash

sitepath=$HOME/synthetichealth/syntheticmass/site
servepath=/var/www/syntheticmass.mitre.org

here=`pwd`

cd $sitepath
echo "Fetching latest..."
git pull
echo "Building site..."
npm run build
echo "Stopping apache..."
sudo systemctl stop apache2.service
echo "Moving files..."
sudo cp -r build $servepath
cd $servepath
sudo rm -r public_html
sudo mv build public_html
echo "Restarting apache..."
sudo systemctl restart apache2.service
cd $here
echo "Done"
