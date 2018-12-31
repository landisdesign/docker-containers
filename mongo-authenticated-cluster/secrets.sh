secret_ua_name="mongo_user_admin_name"
secret_ua_pwd="mongo_user_admin_pwd"
ua_role='"userAdminAnyDatabase"'

secret_dba_name="mongo_db_admin_name"
secret_dba_pwd="mongo_db_admin_pwd"
dba_role='"dbAdminAnyDatabase"'

secret_backup_name="mongo_backup_admin_name"
secret_backup_pwd="mongo_backup_admin_pwd"
backup_role='"backup", "restore"'

missing_secrets=""

set_secret(){
	secrets_dir="/run/secrets/"
	secrets_name=$1
	secret_location="${secrets_dir}${secrets_name}"
	secret=$(cat "${secrets_dir}${secrets_name}")
	if [ -z "${secret}" ]
	then
		missing_secrets="${missing_secrets} ${secrets_name}"
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

ua_roles=$ua_role

if [ "$dba_name" = "$ua_name" ]
then
	ua_roles="${ua_roles}, ${dba_role}"
	dba_password=${ua_password}
else
	dba_roles=${dba_role}
fi

if [ "$bua_name" = "$ua_name" ]
then
	ua_roles="${ua_roles}, ${backup_role}"
	bua_password=${ua_password}
elif [ "$bua_name" = "$dba_name" ]
then
	dba_roles="${dba_roles}, ${backup_role}"
	bua_password=${dba_password}
else
	bua_roles=${backup_role}
fi

if [ "$dba_roles" ]
then
	dba_json=$(
	cat <<EOV
	{
		user: "${dba_name}",
		pwd: "${dba_password}",
		roles: [${dba_roles}]
	}
EOV
	)
fi

if [ "$bua_roles" ]
then
	bua_json=$(
	cat <<EOV
	{
		user: "${bua_name}",
		pwd: "${bua_password}",
		roles: [${bua_roles}]
	}
EOV
	)
fi

cat > ./mongo-admins.js <<EOF
const admin = {
	user: "${ua_name}",
	pwd: "${ua_password}",
	roles: [${ua_roles}]
};
const roles = [
${dba_json}${dba_json:+,}${bua_json}
];
EOF

export bua_name
export bua_password