#! /bin/sh

rm -f ./~password_data.txt
touch ./~password_data.txt

OPTIND=1
missing_args=""
invalid_args=""
while getopts ":a:c:d:h:p:u:" opt
do
	case "${opt}" in
		"a" )
			auth_db="${OPTARG}"
			;;
		"c" )
			echo "${OPTARG}" >> ./~password_data.txt
			;;
		"d" )
			user_db="${OPTARG}"
			;;
		"h" )
			host_url="${OPTARG}"
			;;
		"p" )
			auth_pwd="${OPTARG}"
			;;
		"u" )
			auth_user="${OPTARG}"
			;;
		":" )
			missing_args="${missing_args} -${opt}"
			;;
		"?" )
			invalid_args="${invalid_args} -${OPTARG}"
			;;
	esac
done

if [ -z "${auth_db}" ]
then
	echo "Incomplete command: Option -a (authentication database) missing" >&2
	incomplete="y"
fi

if [ ! -s ./~password_data.txt ]
then
	echo "Incomplete command: Option -c (user=password value) missing" >&2
	incomplete="y"
fi

if [ -z "${user_db}" ]
then
	echo "Incomplete command: Option -d (database containing users) missing" >&2
	incomplete="y"
fi

if [ -z "${host_url}" ]
then
	echo "Incomplete command: Option -h (mongo server/replica set URL) missing" >&2
	incomplete="y"
fi

if [ -z "${auth_pwd}" ]
then
	echo "Incomplete command: Option -p (authentication password) missing" >&2
	incomplete="y"
fi

if [ -z "${auth_user}" ]
then
	echo "Incomplete command: Option -u (authentication user) missing" >&2
	incomplete="y"
fi

if [ "${missing_args}" ]
then
	echo "Incomplete command: Options${missing_args} are missing arguments" >&2
	incomplete="y"
fi

if [ "${invalid_args}" ]
then
	echo "Incomplete command: Options${invalid_args} are invalid" >&2
	incomplete="y"
fi

if [ "${incomplete}" ]
then
	rm -f ./~password_data.txt
	exit 1
fi

rm -f ./~data.txt
echo "const authDBName = \"${auth_db}\";" > ./~data.js
echo "const userDBName = \"${user_db}\";" >> ./~data.js
awk -v auth_user="${auth_user}" 'BEGIN{FS="="} 1{printf("passwords.push({user: \"%s\", pwd: \"%s\", auth: %s});\n", $1, $2, (auth_user == $1 ? "true" : "false") );}' ./~password_data.txt >> ./~data.js

cat ./cp-1.js ./~data.js ./cp-2.js > ./~change-password.js
rm -f ./~password_data.txt ./~data.js

RC=0

mongo -host "${host_url}" -u "${auth_user}" -p "${auth_pwd}" --authenticationDatabase "${auth_db}" ./~change-password.js || RC=$?
rm -f ./~change-password.js

exit $RC