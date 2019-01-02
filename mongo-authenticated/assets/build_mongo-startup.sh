secret_ua_name="mongo_user_admin_name"
secret_ua_pwd="mongo_user_admin_pwd"

secret_dba_name="mongo_db_admin_name"
secret_dba_pwd="mongo_db_admin_pwd"

secret_backup_name="mongo_backup_admin_name"
secret_backup_pwd="mongo_backup_admin_pwd"

missing_secrets=""
newline=$'\n'

set_secret(){
	secrets_dir="/run/secrets/"
	secrets_name=$1
	secret_location="${secrets_dir}${secrets_name}"
	secret=$(cat "${secrets_dir}${secrets_name}")
	if [ -z "${secret}" ]
	then
		missing_secrets="${missing_secrets}${newline}  ${secrets_name}"
	fi
}

set_secret $secret_ua_name
ua_name=$secret
set_secret $secret_ua_pwd
ua_password=$secret
set_secret $secret_dba_name
dba_name=$secret
set_secret $secret_dba_pwd
dba_password=$secret
set_secret $secret_backup_name
bua_name=$secret
set_secret $secret_backup_pwd
bua_password=$secret

if [ "${missing_secrets}" ]
then
	echo "Missing secrets:${missing_secrets}" >&2
	exit 1
fi

cat > /mongo-startup.js <<EOF

load("/UserLoader.js")

UserLoader.addUserAdmin("${ua_name}", "${ua_password}");

UserLoader.addUser("${dba_name}", "${dba_password}", ["dbAdminAnyDatabase"]);
UserLoader.addUser("${bua_name}", "${bua_password}", ["backup", "restore"]);

UserLoader.load();

quit();

EOF

export bua_name
export bua_password