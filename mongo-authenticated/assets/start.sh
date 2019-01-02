set -x

. ./build_mongo-startup.sh

mongod="/usr/bin/mongod"
mongod_log="/var/log/mongodb/mongod.log"
mongod_keyfile="/keyfile"

mongo="/usr/bin/mongo"
mongo_startup_js="/mongo-startup.js"

mongorestore="/usr/bin/mongorestore"
mongorestore_src="/data/mongodb/backup/${MONGO_BACKUP_NAME}"

$mongod --bind_ip_all --smallfiles --logpath $mongod_log --keyFile $mongod_keyfile &

while ! $mongo $mongo_startup_js
do
	echo "Waiting for mongodb to start"
	sleep 5
done

mongorestore_src=$(echo "${mongorestore_src}" | sed -e 's+/$++')

for x in ${mongorestore_src}/*/*
do
	$mongorestore -u "${bua_name}" -p "${bua_password}" --authenticationDatabase "admin" "${mongorestore_src}"
	break
done

fg
