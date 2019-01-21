cp /run/secrets/mongo ./mongo.sh
chmod 777 ./mongo.sh
. ./mongo.sh
rm ./mongo.sh

# I'm running these in an IIFE to avoid any collisions with any other user variable names.
# The parameters prevent closure memory leaks in browsers. I figured it can't hurt here.

cat > /mongo-admins.js <<EOF
// added from mongo-authenticated

(function(User, userList) {

	const userAdmin = User.createUserAdmin("${mongo_user_admin_name}", "${mongo_user_admin_pwd}")
	userList.setUserAdmin(userAdmin);

	const dbAdmin = User.create("${mongo_db_admin_name}", "${mongo_db_admin_pwd}", ["dbAdminAnyDatabase"] );
	userList.addUser(dbAdmin);

	const backupAdmin = User.create("${mongo_backup_admin_name}", "${mongo_backup_admin_pwd}", ["backup", "restore"] );
	userList.addUser(backupAdmin);

})(User, userList);

EOF

export mongo_backup_admin_name
export mongo_backup_admin_pwd