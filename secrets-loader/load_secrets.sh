content=""
for file_list
do
	file_base="/run/secrets/${file_list}"
	for file in ${file_base}
	do
		var_name=$( basename "${file}" )
		case $(file ${file} ) in
			*text* )
				content="${content} ${var_name}=\"$(cat "${file}")\";"
				;;
		esac
	done
done
eval "${content}"