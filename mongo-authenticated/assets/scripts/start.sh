mongod="/usr/bin/mongod"
mongod_log="/var/log/mongodb/mongod.log"
mongod_keyfile="/keyfile"

mongo="/usr/bin/mongo"
mongo_startup_js="/mongo-startup.js"

. ./build_mongo-admins.sh

. ./pre_startup.sh

$mongod --fork --bind_ip_all --smallfiles --logpath $mongod_log --keyFile $mongod_keyfile ${MONGO_OPTIONS}

while ! $mongo $mongo_startup_js
do
	echo "Waiting for mongodb to start"
	sleep 5
done

. ./post_startup.sh

tail -fn +1 $mongod_log