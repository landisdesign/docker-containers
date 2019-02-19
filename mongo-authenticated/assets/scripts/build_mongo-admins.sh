. ./secrets.sh
load_secrets mongo_*

cat > /mongo-admins.js <<EOF
// added from mongo-authenticated
users.push( UserFunctions.createUserOfType("${mongo_user_admin_name}", "${mongo_user_admin_pwd}", "userAdminAnyDatabase") );
users.push( UserFunctions.createUserOfType("${mongo_db_admin_name}", "${mongo_db_admin_pwd}", "dbAdminAnyDatabase") );
users.push( UserFunctions.createUserOfType("${mongo_backup_admin_name}", "${mongo_backup_admin_pwd}", "backupAdmin") );

EOF

export mongo_backup_admin_name
export mongo_backup_admin_pwd