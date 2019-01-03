mongorestore="/usr/bin/mongorestore"
mongorestore_src="/data/mongodb/backup/${MONGO_BACKUP_NAME}"

mongorestore_src=$(echo "${mongorestore_src}" | sed -e 's+/$++')

for x in ${mongorestore_src}/*/*
do
	$mongorestore -u "${bua_name}" -p "${bua_password}" --authenticationDatabase "admin" "${mongorestore_src}"
	break
done
