cp /run/secrets/mongo ./mongo.sh
chmod 700 ./mongo.sh
. ./mongo.sh
rm ./mongo.sh

default_port=27017
host_url=$(echo "${MONGO_HOSTS}" | sed "s/,/:${default_port},/g"):${default_port}
if [ "${MONGO_REPLICA_NAME}" ]
then
	host_url="${MONGO_REPLICA_NAME}/${host_url}"
fi

mongodump --host "${host_url}" --username "${mongo_backup_admin_name}" --password "${mongo_backup_admin_pwd}" --authenticationDatabase "admin" --out "/data/mongodb/backup" --oplog
