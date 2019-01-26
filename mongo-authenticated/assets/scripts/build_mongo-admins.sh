cp /run/secrets/mongo ./mongo.sh
chmod 777 ./mongo.sh
. ./mongo.sh
rm ./mongo.sh

cat > /mongo-admins.js <<EOF
// added from mongo-authenticated
UserLoader.addUserAdmin("${mongo_user_admin_name}", "${mongo_user_admin_pwd}");
UserLoader.addUser("${mongo_db_admin_name}", "${mongo_db_admin_pwd}", ["dbAdminAnyDatabase"]);
UserLoader.addUser("${mongo_backup_admin_name}", "${mongo_backup_admin_pwd}", ["backup", "restore"]);

EOF

export mongo_backup_admin_name
export mongo_backup_admin_pwd