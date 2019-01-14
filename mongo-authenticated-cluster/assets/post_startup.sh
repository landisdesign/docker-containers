$mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --eval "db.shutdownServer(); quit()" admin

wait

$mongod --bind_ip_all --smallfiles --logpath $mongod_log --keyFile $mongod_keyfile --replSet ${MONGO_REPLICA_NAME} &

while ! $mongo --eval "quit()" # ping server until connected then exit
do
	echo "Waiting for mongodb to restart"
	sleep 5
done

should_backup=$( $mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --quiet mongo-cluster-data.js mongo-cluster.js | tail -n 1 );

if [ $should_backup -eq 1 ]
then
	while [ $( $mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --quiet mongo-cluster-status.js) -eq 0 ]
	do
		echo "Waiting for restore to begin"
		sleep 5
	done
	hosts="${MONGO_REPLICA_NAME}/${MONGO_HOSTS}"
	MONGO_BACKUP_OPTIONS="--oplogReplay --host ${hosts}"
	export MONGO_BACKUP_OPTIONS
	. ./restore.sh
fi
