mongorestore="/usr/bin/mongorestore"
mongorestore_src="/data/mongodb/backup/${MONGO_BACKUP_NAME}"

mongorestore_src=$(echo "${mongorestore_src}" | sed -e 's+/$++')

for x in ${mongorestore_src}/*/*
do
	$mongorestore -u "${mongo_backup_admin_name}" -p "${mongo_backup_admin_pwd}" --authenticationDatabase "admin" "${mongorestore_src}"
	break
done
