set -x

mongod="/usr/bin/mongod"
mongod_log="/var/log/mongodb/mongod.log"
mongod_keyfile="/keyfile"

mongo="/usr/bin/mongo"
mongo_startup_js="/mongo-startup.js"

. ./build_mongo-admins.sh

. ./pre_startup.sh

$mongod --bind_ip_all --smallfiles --logpath $mongod_log --keyFile $mongod_keyfile &

while ! $mongo $mongo_startup_js
do
	echo "Waiting for mongodb to start"
	sleep 5
done

. ./post_startup.sh

fg
