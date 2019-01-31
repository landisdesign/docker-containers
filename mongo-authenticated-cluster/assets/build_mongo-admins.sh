. ./build_initial_mongo-admins.sh

cp /run/secrets/mongo_cluster ./mongo_cluster.sh
chmod 777 ./mongo_cluster.sh
. ./mongo_cluster.sh
rm ./mongo_cluster.sh

# NOTE: anyAction is added to existing backup admin to permit replay of oplog in clusters
cat >> /mongo-admins.js <<EOF
// added from mongo-authenticated-cluster
const anyActionPrivilege = UserDefinedRoleFunctions.privilege({anyResource: true}, ["anyAction"]);
roles.push( UserDefinedRoleFunctions.role("anyAction", [anyActionPrivilege], []) );

users.push( UserFunctions.create("${mongo_cluster_admin_name}", "${mongo_cluster_admin_pwd}", ["clusterAdmin"]) );
users.push( UserFunctions.create("${mongo_backup_admin_name}", "${mongo_backup_admin_pwd}", ["anyAction"]) );

EOF

cat > /mongo-cluster-data.js <<EOF
const replicaName = "${MONGO_REPLICA_NAME}";
const replicaHosts = "${MONGO_HOSTS}".replace(/\s*,\s*/g, ",");
const replicaPort = "27017";
const replicaConfig = {
	_id: replicaName,
	members: replicaHosts.split(/,/).map(
		(name, index) => ({ _id: index, host: name + ":" + replicaPort })
	)
};
EOF

export mongo_cluster_admin_name
export mongo_cluster_admin_pwd

export mongo_user_admin_name
export mongo_user_admin_pwd
