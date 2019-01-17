# shut down single server and restart as member of replica set
$mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --quiet --eval "db.shutdownServer(); quit()" admin

wait

$mongod --bind_ip_all --smallfiles --logpath $mongod_log --keyFile $mongod_keyfile --replSet ${MONGO_REPLICA_NAME} &

# ping server until connected then continue
while ! $mongo --quiet --eval "quit()"
do
	echo "Waiting for mongodb to restart"
	sleep 5
done

# Check how replica set is coming up. $should_backup holds one of the following:
# 0: Replica set members are all connected. This instance is not the primary, so don't begin backup.
# 1: Replica set members are all connected. This instance IS the primary, so start backup sequence.
# 2: Replica set members are not all connected. Check again later.
replica_status(){
	status=$( $mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --quiet mongo-cluster-data.js mongo-cluster.js );
	should_backup=$( echo "$status" | tail -n 1 | sed -n 's/^.*\([0-9][0-9]*\)$/\1/p' )
}

replica_status

while [ $should_backup -eq 2 ]
do
	echo "Waiting for all members (${MONGO_HOSTS}) to connect to replica set ${MONGO_REPLICA_NAME}"
	sleep 5
	replica_status
done

# Replica set members are connected, and this is the primary. Perform backup after all members are running.
if [ $should_backup -eq 1 ]
then
	should_restore=0
	while [ $should_restore -eq 0 ]
	do
		echo "Waiting for replica set to come online before restoration from backup"
		sleep 5
		restore_status=$( $mongo -u "${mongo_cluster_admin_name}" -p "${mongo_cluster_admin_pwd}" --authenticationDatabase "admin" --quiet mongo-cluster-status.js)
		should_restore=$( echo "$restore_status" | tail -n 1 | sed -n 's/.*\([0-9][0-9]*\)$/\1/p' )
	done
	hosts="${MONGO_REPLICA_NAME}/${MONGO_HOSTS}"
	MONGO_BACKUP_OPTIONS="--oplogReplay --host ${hosts}"
	export MONGO_BACKUP_OPTIONS
	. ./restore.sh
fi
