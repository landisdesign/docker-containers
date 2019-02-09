for file_list in $@
do
	file_base="/run/secrets/${file_list}"
	for file in ${file_base}
	do
		var_name=$( basename "${file}" )
		case $(file ${file} ) in
			*text* )
				printf "%s=\"%s\"\n" "${var_name}" "$(cat ${file})"
				;;
		esac
	done
done
