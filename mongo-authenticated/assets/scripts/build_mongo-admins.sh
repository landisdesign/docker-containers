. ./secrets.sh
load_secrets mongo_*

cat > /mongo-admins.js <<EOF
// added from mongo-authenticated
users.push( UserFunctions.createAdmin("${mongo_user_admin_name}", "${mongo_user_admin_pwd}") );
users.push( UserFunctions.create("${mongo_db_admin_name}", "${mongo_db_admin_pwd}", ["dbAdminAnyDatabase", "updateSelf"]) );
users.push( UserFunctions.create("${mongo_backup_admin_name}", "${mongo_backup_admin_pwd}", ["backup", "restore", "updateSelf"]) );

EOF

export mongo_backup_admin_name
export mongo_backup_admin_pwd